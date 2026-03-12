import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/logger';

export const passagensRouter = Router();
passagensRouter.use(authenticate);

// Helper para obter params como string
function getParam(params: Request['params'], key: string): string {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}

// Helper para obter query params como string
function getQueryParam(query: Request['query'], key: string): string | undefined {
    const value = query[key];
    if (typeof value === 'object' && value !== null) return undefined;
    return Array.isArray(value) ? value[0] : value;
}

const passagemSchema = z.object({
    processoId: z.string().uuid(),
    linhaId: z.string().uuid().optional(),
    tipo: z.enum(['IDA', 'VOLTA']),
    dataViagem: z.string().transform(v => new Date(v)),
    numeroPassagem: z.string().optional(),
    empresa: z.string().optional(),
    valor: z.number().optional(),
    observacoes: z.string().optional(),
});

// List by processo
passagensRouter.get('/', async (req: Request, res: Response) => {
    const processoId = getQueryParam(req.query, 'processoId');
    const where = processoId ? { processoId } : {};
    
    const passagens = await prisma.passagem.findMany({
        where,
        include: {
            linha: true,
            processo: {
                select: {
                    id: true,
                    numero: true,
                    paciente: {
                        select: { nome: true, cpf: true }
                    }
                }
            }
        },
        orderBy: { dataViagem: 'asc' },
    });
    res.json(passagens);
});

// Get by ID
passagensRouter.get('/:id', async (req: Request, res: Response) => {
    const passagem = await prisma.passagem.findUnique({
        where: { id: getParam(req.params, 'id') },
        include: {
            linha: true,
            processo: {
                select: {
                    id: true,
                    numero: true,
                    paciente: {
                        select: { nome: true, cpf: true }
                    }
                }
            }
        }
    });
    if (!passagem) {
        res.status(404).json({ error: 'Passagem não encontrada.' });
        return;
    }
    res.json(passagem);
});

// Create
passagensRouter.post('/', authorize('UBS', 'ATENDENTE', 'SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = passagemSchema.parse(req.body);
        const passagem = await prisma.passagem.create({
            data,
            include: { linha: true, processo: { select: { id: true, numero: true } } }
        });

        await logAction({
            req,
            acao: 'CREATE',
            entidade: 'PASSAGEM',
            entidadeId: passagem.id,
            detalhes: `Passagem ${passagem.tipo} criada para o processo ${passagem.processo.numero}`
        });

        res.status(201).json(passagem);
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors });
            return;
        }
        throw err;
    }
});

// Update
passagensRouter.put('/:id', authorize('UBS', 'ATENDENTE', 'SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = passagemSchema.partial().parse(req.body);
        const passagem = await prisma.passagem.update({
            where: { id: getParam(req.params, 'id') },
            data,
            include: { linha: true, processo: { select: { id: true, numero: true } } }
        });

        await logAction({
            req,
            acao: 'UPDATE',
            entidade: 'PASSAGEM',
            entidadeId: passagem.id,
            detalhes: `Passagem ${passagem.tipo} do processo ${passagem.processo.numero} atualizada.`
        });

        res.json(passagem);
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors });
            return;
        }
        throw err;
    }
});

// Delete
passagensRouter.delete('/:id', authorize('UBS', 'ATENDENTE', 'SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    const id = getParam(req.params, 'id');
    const passagem = await prisma.passagem.findUnique({ 
        where: { id },
        include: { processo: { select: { id: true, numero: true } } }
    });
    
    if (!passagem) {
        res.status(404).json({ error: 'Passagem não encontrada.' });
        return;
    }

    const numeroProcesso = passagem.processo.numero;

    await prisma.passagem.delete({ where: { id } });

    await logAction({
        req,
        acao: 'DELETE',
        entidade: 'PASSAGEM',
        entidadeId: id,
        detalhes: `Passagem ${passagem.tipo} do processo ${numeroProcesso} removida.`
    });

    res.status(204).send();
});

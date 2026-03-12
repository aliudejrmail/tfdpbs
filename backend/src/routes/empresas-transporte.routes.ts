import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/logger';

export const empresasTransporteRouter = Router();
empresasTransporteRouter.use(authenticate);

// Helper para obter params como string
function getParam(params: Request['params'], key: string): string {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}

const empresaTransporteSchema = z.object({
    nome: z.string().min(3),
    cnpj: z.string(),
    ativo: z.boolean().default(true),
    tipo: z.string(), // "AMBULANCIA", "VAN", "TODOS", etc.
});

// List
empresasTransporteRouter.get('/', async (req: Request, res: Response) => {
    const empresas = await prisma.empresaTransporte.findMany({
        orderBy: { nome: 'asc' },
    });
    res.json(empresas);
});

// Get by ID
empresasTransporteRouter.get('/:id', async (req: Request, res: Response) => {
    const empresa = await prisma.empresaTransporte.findUnique({
        where: { id: getParam(req.params, 'id') },
    });
    if (!empresa) {
        res.status(404).json({ error: 'Empresa não encontrada.' });
        return;
    }
    res.json(empresa);
});

// Create
empresasTransporteRouter.post('/', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    try {
        const data = empresaTransporteSchema.parse(req.body);
        const empresa = await prisma.empresaTransporte.create({ data });

        await logAction({
            req,
            acao: 'CREATE',
            entidade: 'EMPRESA_TRANSPORTE',
            entidadeId: empresa.id,
            detalhes: `Empresa de transporte ${empresa.nome} cadastrada.`
        });

        res.status(201).json(empresa);
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors });
            return;
        }
        throw err;
    }
});

// Update
empresasTransporteRouter.put('/:id', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    try {
        const data = empresaTransporteSchema.partial().parse(req.body);
        const empresa = await prisma.empresaTransporte.update({
            where: { id: getParam(req.params, 'id') },
            data,
        });

        await logAction({
            req,
            acao: 'UPDATE',
            entidade: 'EMPRESA_TRANSPORTE',
            entidadeId: getParam(req.params, 'id'),
            detalhes: `Dados da empresa ${empresa.nome} atualizados.`
        });

        res.json(empresa);
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors });
            return;
        }
        throw err;
    }
});

// Delete
empresasTransporteRouter.delete('/:id', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    const id = getParam(req.params, 'id');
    await prisma.empresaTransporte.delete({
        where: { id },
    });

    await logAction({
        req,
        acao: 'DELETE',
        entidade: 'EMPRESA_TRANSPORTE',
        entidadeId: id,
        detalhes: `Empresa de transporte removida.`
    });

    res.status(204).send();
});

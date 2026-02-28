import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/logger';

export const linhasOnibusRouter = Router();
linhasOnibusRouter.use(authenticate);

const linhaSchema = z.object({
    nome: z.string().min(3, 'Nome da linha é obrigatório'),
    empresa: z.string().optional(),
    origem: z.string().min(2, 'Origem é obrigatória'),
    destino: z.string().min(2, 'Destino é obrigatório'),
    horarios: z.string().optional(),
    ativo: z.boolean().default(true),
});

// List
linhasOnibusRouter.get('/', async (req: Request, res: Response) => {
    const { search, ativo } = req.query;

    const where: any = {};
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (search) {
        where.OR = [
            { nome: { contains: String(search), mode: 'insensitive' } },
            { empresa: { contains: String(search), mode: 'insensitive' } },
            { origem: { contains: String(search), mode: 'insensitive' } },
            { destino: { contains: String(search), mode: 'insensitive' } },
        ];
    }

    const linhas = await (prisma as any).linha.findMany({
        where,
        orderBy: { nome: 'asc' },
    });

    res.json(linhas);
});

// Create
linhasOnibusRouter.post('/', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = linhaSchema.parse(req.body);
        const linha = await (prisma as any).linha.create({ data });

        await logAction({
            req,
            acao: 'CREATE',
            entidade: 'UNIDADE', // Reutilizando categoria similar se não houver LINHA_ONIBUS no enum de string mas o campo é string livre
            entidadeId: linha.id,
            detalhes: `Linha de ônibus ${linha.nome} cadastrada.`
        });

        res.status(201).json(linha);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação nos campos.' });
        throw err;
    }
});

// Update
linhasOnibusRouter.put('/:id', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = linhaSchema.partial().parse(req.body);
        const linha = await (prisma as any).linha.update({
            where: { id: req.params.id },
            data,
        });

        await logAction({
            req,
            acao: 'UPDATE',
            entidade: 'UNIDADE',
            entidadeId: linha.id,
            detalhes: `Linha de ônibus ${linha.nome} atualizada.`
        });

        res.json(linha);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação nos campos.' });
        throw err;
    }
});

// Delete (ou desativar)
linhasOnibusRouter.delete('/:id', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    const linha = await (prisma as any).linha.update({
        where: { id: req.params.id },
        data: { ativo: false }
    });

    await logAction({
        req,
        acao: 'UPDATE',
        entidade: 'UNIDADE',
        entidadeId: linha.id,
        detalhes: `Linha de ônibus ${linha.nome} desativada.`
    });

    res.json({ message: 'Linha desativada com sucesso.' });
});

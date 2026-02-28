import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/logger';

export const motoristasRouter = Router();
motoristasRouter.use(authenticate);

const motoristaSchema = z.object({
    nome: z.string().min(3),
    cpf: z.string().min(11),
    cnh: z.string().min(5),
    telefone: z.string().optional(),
    ativo: z.boolean().default(true),
});

// List
motoristasRouter.get('/', async (req: Request, res: Response) => {
    const { search, ativo } = req.query;
    const where: any = {};
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (search) {
        where.OR = [
            { nome: { contains: String(search), mode: 'insensitive' } },
            { cpf: { contains: String(search) } },
        ];
    }
    const motoristas = await (prisma as any).motorista.findMany({ where, orderBy: { nome: 'asc' } });
    res.json(motoristas);
});

// Create
motoristasRouter.post('/', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = motoristaSchema.parse(req.body);
        const motorista = await (prisma as any).motorista.create({ data });
        await logAction({ req, acao: 'CREATE', entidade: 'USUARIO', entidadeId: motorista.id, detalhes: `Motorista ${motorista.nome} cadastrado.` });
        res.status(201).json(motorista);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação.' });
        throw err;
    }
});

// Update
motoristasRouter.put('/:id', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = motoristaSchema.partial().parse(req.body);
        const motorista = await (prisma as any).motorista.update({ where: { id: req.params.id }, data });
        await logAction({ req, acao: 'UPDATE', entidade: 'USUARIO', entidadeId: motorista.id, detalhes: `Motorista ${motorista.nome} atualizado.` });
        res.json(motorista);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação.' });
        throw err;
    }
});

// Delete (Desativar)
motoristasRouter.delete('/:id', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    const motorista = await (prisma as any).motorista.update({ where: { id: req.params.id }, data: { ativo: false } });
    await logAction({ req, acao: 'UPDATE', entidade: 'USUARIO', entidadeId: motorista.id, detalhes: `Motorista ${motorista.nome} desativado.` });
    res.json({ message: 'Motorista desativado.' });
});

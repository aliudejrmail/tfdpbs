import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/logger';

export const medicosRouter = Router();
medicosRouter.use(authenticate);

const medicoSchema = z.object({
    nome: z.string().min(3),
    crm: z.string().min(4),
    especialidade: z.string().optional(),
    unidadeId: z.string().uuid(),
    ativo: z.boolean().default(true),
});

// List
medicosRouter.get('/', async (req: Request, res: Response) => {
    const { search, unidadeId, ativo } = req.query;
    const where: any = {};
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (unidadeId) where.unidadeId = String(unidadeId);
    if (search) {
        where.OR = [
            { nome: { contains: String(search), mode: 'insensitive' } },
            { crm: { contains: String(search) } },
            { especialidade: { contains: String(search), mode: 'insensitive' } },
        ];
    }
    const medicos = await prisma.medico.findMany({
        where,
        include: { unidade: { select: { nome: true } } },
        orderBy: { nome: 'asc' }
    });
    res.json(medicos);
});

// Create
medicosRouter.post('/', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = medicoSchema.parse(req.body);
        const medico = await prisma.medico.create({ data });
        await logAction({ req, acao: 'CREATE', entidade: 'USUARIO', entidadeId: medico.id, detalhes: `Médico ${medico.nome} cadastrado na unidade ${medico.unidadeId}.` });
        res.status(201).json(medico);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação.' });
        throw err;
    }
});

// Update
medicosRouter.put('/:id', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const data = medicoSchema.partial().parse(req.body);
        const medico = await prisma.medico.update({ where: { id }, data });
        await logAction({ req, acao: 'UPDATE', entidade: 'USUARIO', entidadeId: medico.id, detalhes: `Médico ${medico.nome} atualizado.` });
        res.json(medico);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação.' });
        throw err;
    }
});

// Delete (Desativar)
medicosRouter.delete('/:id', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const medico = await prisma.medico.update({ where: { id }, data: { ativo: false } });
    await logAction({ req, acao: 'UPDATE', entidade: 'USUARIO', entidadeId: medico.id, detalhes: `Médico ${medico.nome} desativado.` });
    res.json({ message: 'Médico desativado.' });
});

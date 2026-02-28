import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

export const unidadesRouter = Router();
unidadesRouter.use(authenticate);

const unidadeSchema = z.object({
    nome: z.string().min(3),
    cnes: z.string().min(6),
    tipo: z.string(),
});

unidadesRouter.get('/', async (_req: Request, res: Response) => {
    const unidades = await prisma.unidade.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } });
    res.json(unidades);
});

unidadesRouter.get('/:id', async (req: Request, res: Response) => {
    const unidade = await prisma.unidade.findUnique({ where: { id: req.params.id as string } });
    if (!unidade) { res.status(404).json({ error: 'Unidade não encontrada.' }); return; }
    res.json(unidade);
});

unidadesRouter.post('/', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    try {
        const data = unidadeSchema.parse(req.body);
        const unidade = await prisma.unidade.create({ data });
        res.status(201).json(unidade);
    } catch (err) {
        if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
        throw err;
    }
});

unidadesRouter.put('/:id', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    try {
        const data = unidadeSchema.partial().parse(req.body);
        const unidade = await prisma.unidade.update({ where: { id: req.params.id as string }, data });
        res.json(unidade);
    } catch (err) {
        if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
        throw err;
    }
});

unidadesRouter.delete('/:id', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    await prisma.unidade.update({ where: { id: req.params.id as string }, data: { ativo: false } });
    res.status(204).send();
});

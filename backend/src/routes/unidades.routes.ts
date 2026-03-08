import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

export const unidadesRouter = Router();
unidadesRouter.use(authenticate);

// Helper para obter params como string
function getParam(params: Request['params'], key: string): string {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}

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
    const unidade = await prisma.unidade.findUnique({ where: { id: getParam(req.params, 'id') } });
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
        const unidade = await prisma.unidade.update({ where: { id: getParam(req.params, 'id') }, data });
        res.json(unidade);
    } catch (err) {
        if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
        throw err;
    }
});

unidadesRouter.delete('/:id', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    await prisma.unidade.update({ where: { id: getParam(req.params, 'id') }, data: { ativo: false } });
    res.status(204).send();
});

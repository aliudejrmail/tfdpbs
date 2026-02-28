import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/logger';

export const veiculosRouter = Router();
veiculosRouter.use(authenticate);

const veiculoSchema = z.object({
    placa: z.string().min(7).max(8),
    modelo: z.string().min(2),
    capacidade: z.number().int().min(1),
    ativo: z.boolean().default(true),
});

// List
veiculosRouter.get('/', async (req: Request, res: Response) => {
    const { search, ativo } = req.query;
    const where: any = {};
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (search) {
        where.OR = [
            { placa: { contains: String(search), mode: 'insensitive' } },
            { modelo: { contains: String(search), mode: 'insensitive' } },
        ];
    }
    const veiculos = await (prisma as any).veiculo.findMany({ where, orderBy: { modelo: 'asc' } });
    res.json(veiculos);
});

// Create
veiculosRouter.post('/', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = veiculoSchema.parse(req.body);
        const veiculo = await (prisma as any).veiculo.create({ data });
        await logAction({ req, acao: 'CREATE', entidade: 'UNIDADE', entidadeId: veiculo.id, detalhes: `Veículo ${veiculo.placa} (${veiculo.modelo}) cadastrado.` });
        res.status(201).json(veiculo);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação.' });
        throw err;
    }
});

// Update
veiculosRouter.put('/:id', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = veiculoSchema.partial().parse(req.body);
        const veiculo = await (prisma as any).veiculo.update({ where: { id: req.params.id }, data });
        await logAction({ req, acao: 'UPDATE', entidade: 'UNIDADE', entidadeId: veiculo.id, detalhes: `Veículo ${veiculo.placa} atualizado.` });
        res.json(veiculo);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação.' });
        throw err;
    }
});

// Delete (Desativar)
veiculosRouter.delete('/:id', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    const veiculo = await (prisma as any).veiculo.update({ where: { id: req.params.id }, data: { ativo: false } });
    await logAction({ req, acao: 'UPDATE', entidade: 'UNIDADE', entidadeId: veiculo.id, detalhes: `Veículo ${veiculo.placa} desativado.` });
    res.json({ message: 'Veículo desativado.' });
});

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/logger';

export const casaApoioRouter = Router();
casaApoioRouter.use(authenticate);

const db = prisma as any;

// ===================== CASAS DE APOIO =====================

const casaSchema = z.object({
    nome: z.string().min(3),
    endereco: z.string().optional(),
    cidade: z.string().min(2),
    telefone: z.string().optional(),
    totalLeitos: z.number().int().positive().default(10),
});

// List casas de apoio
casaApoioRouter.get('/', async (req: Request, res: Response) => {
    const { ativo } = req.query;
    const where: any = {};
    if (ativo !== undefined) where.ativo = ativo === 'true';

    const casas = await db.casaApoio.findMany({
        where,
        include: {
            _count: { select: { vales: { where: { status: 'ATIVO' } } } }
        },
        orderBy: { nome: 'asc' },
    });
    res.json(casas);
});

// Create
casaApoioRouter.post('/', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = casaSchema.parse(req.body);
        const casa = await db.casaApoio.create({ data });
        await logAction({ req, acao: 'CREATE', entidade: 'UNIDADE', entidadeId: casa.id, detalhes: `Casa de Apoio "${casa.nome}" cadastrada.` });
        res.status(201).json(casa);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação.' });
        throw err;
    }
});

// Update
casaApoioRouter.put('/:id', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = casaSchema.partial().parse(req.body);
        const casa = await db.casaApoio.update({ where: { id: req.params.id as string }, data });
        await logAction({ req, acao: 'UPDATE', entidade: 'UNIDADE', entidadeId: casa.id, detalhes: `Casa de Apoio "${casa.nome}" atualizada.` });
        res.json(casa);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação.' });
        throw err;
    }
});

// Toggle ativo
casaApoioRouter.delete('/:id', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    const casa = await db.casaApoio.update({ where: { id: req.params.id as string }, data: { ativo: false } });
    await logAction({ req, acao: 'UPDATE', entidade: 'UNIDADE', entidadeId: casa.id, detalhes: `Casa de Apoio "${casa.nome}" desativada.` });
    res.json({ message: 'Casa de Apoio desativada.' });
});

// ===================== VALES DE HOSPEDAGEM =====================

const valeSchema = z.object({
    processoId: z.string(),
    casaApoioId: z.string(),
    dataEntrada: z.string().transform(s => new Date(s)),
    dataSaida: z.string().optional().transform(s => s ? new Date(s) : undefined),
    acompanhante: z.boolean().default(false),
    observacoes: z.string().optional(),
});

// List vales
casaApoioRouter.get('/vales', async (req: Request, res: Response) => {
    const { casaApoioId, status } = req.query;
    const where: any = {};
    if (casaApoioId) where.casaApoioId = String(casaApoioId);
    if (status) where.status = String(status);

    const vales = await db.valeHospedagem.findMany({
        where,
        include: {
            processo: { include: { paciente: true } },
            casaApoio: true,
            criadoPor: { select: { id: true, nome: true } },
        },
        orderBy: { dataEntrada: 'desc' },
    });
    res.json(vales);
});

// Create vale
casaApoioRouter.post('/vales', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = valeSchema.parse(req.body);
        const vale = await db.valeHospedagem.create({
            data: { ...data, criadoPorId: (req as any).user!.id },
            include: { processo: { include: { paciente: true } }, casaApoio: true },
        });
        await logAction({ req, acao: 'CREATE', entidade: 'PROCESSO', entidadeId: vale.id, detalhes: `Vale-hospedagem emitido para ${vale.casaApoio.nome}.` });
        res.status(201).json(vale);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação.' });
        throw err;
    }
});

// Encerrar vale (check-out)
casaApoioRouter.patch('/vales/:id/encerrar', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    const vale = await db.valeHospedagem.update({
        where: { id: req.params.id as string },
        data: { status: 'ENCERRADO', dataSaida: new Date() },
    });
    await logAction({ req, acao: 'UPDATE', entidade: 'PROCESSO', entidadeId: vale.id, detalhes: 'Vale-hospedagem encerrado (check-out).' });
    res.json(vale);
});

// Cancelar vale
casaApoioRouter.patch('/vales/:id/cancelar', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    const vale = await db.valeHospedagem.update({
        where: { id: req.params.id as string },
        data: { status: 'CANCELADO' },
    });
    await logAction({ req, acao: 'UPDATE', entidade: 'PROCESSO', entidadeId: vale.id, detalhes: 'Vale-hospedagem cancelado.' });
    res.json(vale);
});

// Ocupação de uma casa
casaApoioRouter.get('/:id/ocupacao', async (req: Request, res: Response) => {
    const casa = await db.casaApoio.findUnique({ where: { id: req.params.id as string } });
    if (!casa) { res.status(404).json({ error: 'Casa de Apoio não encontrada.' }); return; }
    const ocupados = await db.valeHospedagem.count({ where: { casaApoioId: casa.id, status: 'ATIVO' } });
    res.json({ totalLeitos: casa.totalLeitos, ocupados, disponiveis: casa.totalLeitos - ocupados });
});

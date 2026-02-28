import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/logger';

export const financeiroRouter = Router();
financeiroRouter.use(authenticate);

const db = prisma as any;

// ===================== AJUDAS DE CUSTO =====================

const ajudaSchema = z.object({
    processoId: z.string(),
    tipo: z.string(), // ALIMENTACAO, TRANSPORTE_URBANO, HOSPEDAGEM, OUTROS
    descricao: z.string().optional(),
    valor: z.number().positive(),
    dataReferencia: z.string().transform(s => new Date(s)),
});

// List ajudas de custo
financeiroRouter.get('/ajudas-custo', async (req: Request, res: Response) => {
    const { processoId, status } = req.query;
    const where: any = {};
    if (processoId) where.processoId = String(processoId);
    if (status) where.status = String(status);

    const ajudas = await db.ajudaCusto.findMany({
        where,
        include: {
            processo: { include: { paciente: true } },
            criadoPor: { select: { id: true, nome: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json(ajudas);
});

// Create ajuda de custo
financeiroRouter.post('/ajudas-custo', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = ajudaSchema.parse(req.body);
        const ajuda = await db.ajudaCusto.create({
            data: { ...data, criadoPorId: (req as any).user!.id },
            include: { processo: { include: { paciente: true } } },
        });
        await logAction({ req, acao: 'CREATE', entidade: 'PROCESSO', entidadeId: ajuda.id, detalhes: `Ajuda de custo R$ ${data.valor} (${data.tipo}) lançada.` });
        res.status(201).json(ajuda);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação.' });
        throw err;
    }
});

// Update status ajuda
financeiroRouter.patch('/ajudas-custo/:id/status', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    const { status } = req.body;
    const ajuda = await db.ajudaCusto.update({
        where: { id: req.params.id as string },
        data: { status },
    });
    await logAction({ req, acao: 'UPDATE', entidade: 'PROCESSO', entidadeId: ajuda.id, detalhes: `Ajuda de custo atualizada para ${status}.` });
    res.json(ajuda);
});

// Delete ajuda
financeiroRouter.delete('/ajudas-custo/:id', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    await db.ajudaCusto.delete({ where: { id: req.params.id as string } });
    await logAction({ req, acao: 'DELETE', entidade: 'PROCESSO', entidadeId: req.params.id as string, detalhes: 'Ajuda de custo removida.' });
    res.json({ message: 'Ajuda removida.' });
});

// Resumo financeiro por processo
financeiroRouter.get('/resumo/:processoId', async (req: Request, res: Response) => {
    const processoId = req.params.id as string || req.params.processoId as string;
    const ajudas = await db.ajudaCusto.findMany({
        where: { processoId },
        orderBy: { createdAt: 'desc' },
    });
    const total = ajudas.reduce((sum: number, a: any) => sum + parseFloat(a.valor), 0);
    const porTipo = ajudas.reduce((acc: any, a: any) => {
        acc[a.tipo] = (acc[a.tipo] || 0) + parseFloat(a.valor);
        return acc;
    }, {});
    res.json({ ajudas, total, porTipo });
});

// ===================== DIÁRIAS =====================

const diariaSchema = z.object({
    motoristaId: z.string(),
    viagemId: z.string(),
    tipo: z.string(), // COMPLETA, MEIA
    valor: z.number().positive(),
    dataReferencia: z.string().transform(s => new Date(s)),
});

// List diarias
financeiroRouter.get('/diarias', async (req: Request, res: Response) => {
    const { motoristaId, status, mes, ano } = req.query;
    const where: any = {};
    if (motoristaId) where.motoristaId = String(motoristaId);
    if (status) where.status = String(status);
    if (mes && ano) {
        const inicio = new Date(Number(ano), Number(mes) - 1, 1);
        const fim = new Date(Number(ano), Number(mes), 0, 23, 59, 59);
        where.dataReferencia = { gte: inicio, lte: fim };
    }

    const diarias = await db.diaria.findMany({
        where,
        include: {
            motorista: true,
            viagem: { include: { linha: true } },
            criadoPor: { select: { id: true, nome: true } },
        },
        orderBy: { dataReferencia: 'desc' },
    });
    res.json(diarias);
});

// Create diaria
financeiroRouter.post('/diarias', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = diariaSchema.parse(req.body);
        const diaria = await db.diaria.create({
            data: { ...data, criadoPorId: (req as any).user!.id },
            include: { motorista: true, viagem: true },
        });
        await logAction({ req, acao: 'CREATE', entidade: 'USUARIO', entidadeId: diaria.id, detalhes: `Diária ${data.tipo} R$ ${data.valor} lançada para motorista.` });
        res.status(201).json(diaria);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação.' });
        throw err;
    }
});

// Update status diaria
financeiroRouter.patch('/diarias/:id/status', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    const { status } = req.body;
    const diaria = await db.diaria.update({
        where: { id: req.params.id as string },
        data: { status },
    });
    await logAction({ req, acao: 'UPDATE', entidade: 'USUARIO', entidadeId: diaria.id, detalhes: `Diária atualizada para ${status}.` });
    res.json(diaria);
});

// Resumo diarias por motorista
financeiroRouter.get('/diarias/resumo', async (req: Request, res: Response) => {
    const { mes, ano } = req.query;
    const where: any = {};
    if (mes && ano) {
        const inicio = new Date(Number(ano), Number(mes) - 1, 1);
        const fim = new Date(Number(ano), Number(mes), 0, 23, 59, 59);
        where.dataReferencia = { gte: inicio, lte: fim };
    }

    const diarias = await db.diaria.findMany({
        where,
        include: { motorista: true },
    });

    const porMotorista: any = {};
    diarias.forEach((d: any) => {
        const key = d.motoristaId;
        if (!porMotorista[key]) {
            porMotorista[key] = { motorista: d.motorista, total: 0, quantidade: 0 };
        }
        porMotorista[key].total += parseFloat(d.valor);
        porMotorista[key].quantidade++;
    });

    res.json(Object.values(porMotorista));
});

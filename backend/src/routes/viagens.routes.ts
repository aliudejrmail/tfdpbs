import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/logger';

export const viagensRouter = Router();
viagensRouter.use(authenticate);

const viagemSchema = z.object({
    dataPartida: z.string().transform(s => new Date(s)),
    dataRetorno: z.string().optional().transform(s => s ? new Date(s) : undefined),
    veiculoId: z.string().optional(),
    motoristaId: z.string().optional(),
    linhaId: z.string().optional(),
    status: z.string().default('PLANEJADA'),
    observacoes: z.string().optional(),
});

const passageiroSchema = z.object({
    processoId: z.string(),
    acompanhante: z.boolean().default(false),
});

const db = prisma as any;

// List viagens
viagensRouter.get('/', async (req: Request, res: Response) => {
    const { status, dataInicio, dataFim } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (dataInicio || dataFim) {
        where.dataPartida = {};
        if (dataInicio) where.dataPartida.gte = new Date(String(dataInicio));
        if (dataFim) where.dataPartida.lte = new Date(String(dataFim));
    }

    const viagens = await db.viagem.findMany({
        where,
        include: {
            veiculo: true,
            motorista: true,
            linha: true,
            passageiros: {
                include: {
                    processo: {
                        include: { paciente: true }
                    }
                }
            }
        },
        orderBy: { dataPartida: 'desc' },
    });
    res.json(viagens);
});

// Get viagem detail
viagensRouter.get('/:id', async (req: Request, res: Response) => {
    const viagem = await db.viagem.findUnique({
        where: { id: req.params.id },
        include: {
            veiculo: true,
            motorista: true,
            linha: true,
            passageiros: {
                include: {
                    processo: {
                        include: { paciente: true }
                    }
                }
            }
        },
    });
    if (!viagem) { res.status(404).json({ error: 'Viagem não encontrada.' }); return; }
    res.json(viagem);
});

// Create viagem
viagensRouter.post('/', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = viagemSchema.parse(req.body);
        const viagem = await db.viagem.create({
            data,
            include: { veiculo: true, motorista: true, linha: true }
        });
        await logAction({ req, acao: 'CREATE', entidade: 'PROCESSO', entidadeId: viagem.id, detalhes: `Viagem criada para ${new Date(viagem.dataPartida).toLocaleDateString('pt-BR')}.` });
        res.status(201).json(viagem);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação.' });
        throw err;
    }
});

// Update viagem
viagensRouter.put('/:id', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = viagemSchema.partial().parse(req.body);
        const viagem = await db.viagem.update({
            where: { id: req.params.id },
            data,
            include: { veiculo: true, motorista: true, linha: true }
        });
        await logAction({ req, acao: 'UPDATE', entidade: 'PROCESSO', entidadeId: viagem.id, detalhes: `Viagem atualizada.` });
        res.json(viagem);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação.' });
        throw err;
    }
});

// Update status
viagensRouter.patch('/:id/status', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    const { status } = req.body;
    const viagem = await db.viagem.update({
        where: { id: req.params.id },
        data: { status },
    });
    await logAction({ req, acao: 'UPDATE', entidade: 'PROCESSO', entidadeId: viagem.id, detalhes: `Status da viagem alterado para ${status}.` });
    res.json(viagem);
});

// Add passageiro
viagensRouter.post('/:id/passageiros', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = passageiroSchema.parse(req.body);
        const passageiro = await db.passageiroViagem.create({
            data: { ...data, viagemId: req.params.id as string },
            include: { processo: { include: { paciente: true } } }
        });
        await logAction({ req, acao: 'CREATE', entidade: 'PROCESSO', entidadeId: req.params.id as string, detalhes: `Passageiro adicionado à viagem.` });
        res.status(201).json(passageiro);
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: 'Erro de validação.' });
        throw err;
    }
});

// Remove passageiro
viagensRouter.delete('/:id/passageiros/:passageiroId', authorize('SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    await db.passageiroViagem.delete({ where: { id: req.params.passageiroId as string } });
    await logAction({ req, acao: 'DELETE', entidade: 'PROCESSO', entidadeId: req.params.id as string, detalhes: `Passageiro removido da viagem.` });
    res.json({ message: 'Passageiro removido.' });
});

// Processos aprovados disponíveis para alocar
viagensRouter.get('/processos/disponiveis', async (_req: Request, res: Response) => {
    const processos = await prisma.processoTFD.findMany({
        where: { status: { in: ['APROVADO', 'AGENDADO'] } },
        include: { paciente: true, unidadeOrigem: true },
        orderBy: { createdAt: 'desc' },
    });
    res.json(processos);
});

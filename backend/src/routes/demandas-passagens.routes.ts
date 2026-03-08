import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/logger';
import { StatusPassagemAerea } from '@prisma/client';

export const demandasPassagensRouter = Router();
demandasPassagensRouter.use(authenticate);

const demandaSchema = z.object({
    processoId: z.string().uuid(),
    origem: z.string().min(2).default('Parauapebas'),
    destino: z.string().min(2),
    dataIda: z.string().transform(v => new Date(v)),
    dataVolta: z.string().optional().transform(v => v ? new Date(v) : undefined),
    justificativa: z.string().min(10),
    necessitaUrgencia: z.boolean().default(false),
});

const statusUpdateSchema = z.object({
    status: z.nativeEnum(StatusPassagemAerea),
    pnr: z.string().optional(),
    companhiaAerea: z.string().optional(),
    valorTotal: z.number().optional(),
});

// Listar todas as demandas
demandasPassagensRouter.get('/', async (req: Request, res: Response) => {
    try {
        const { status, processoId, page = '1', limit = '20' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const where: any = {};
        if (status) where.status = status as string;
        if (processoId) where.processoId = processoId as string;

        const [demandas, total] = await Promise.all([
            prisma.demandaPassagemAerea.findMany({
                where,
                include: {
                    processo: {
                        include: {
                            paciente: true,
                        }
                    },
                    solicitadoPor: {
                        select: { nome: true, login: true }
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            prisma.demandaPassagemAerea.count({ where }),
        ]);

        res.json({
            demandas,
            total,
            pages: Math.ceil(total / take),
        });
    } catch (error) {
        console.error('[GET /passagens-aereas] Erro:', error);
        res.status(500).json({ error: 'Erro ao buscar demandas de passagens.' });
    }
});

// Criar nova demanda
demandasPassagensRouter.post('/', authorize('UBS', 'ATENDENTE', 'SEC_ADM', 'REGULACAO'), async (req: Request, res: Response) => {
    try {
        const data = demandaSchema.parse(req.body);
        const solicitadoPorId = req.user!.userId;

        const processo = await prisma.processoTFD.findUnique({
            where: { id: data.processoId },
            include: { paciente: true }
        });

        if (!processo) {
            return res.status(404).json({ error: 'Processo TFD não encontrado.' });
        }

        const demanda = await prisma.demandaPassagemAerea.create({
            data: {
                ...data,
                solicitadoPorId,
                status: 'PENDENTE'
            },
            include: {
                processo: { include: { paciente: true } }
            }
        });

        await logAction({
            req,
            acao: 'CREATE',
            entidade: 'PROCESSO', // Vinculado ao processo para histórico centralizado
            entidadeId: data.processoId,
            detalhes: `Solicitada demanda de passagem aérea para ${processo.paciente.nome}. Destino: ${data.destino}`
        });

        res.status(201).json(demanda);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Dados inválidos.', details: error.errors });
        }
        console.error('[POST /passagens-aereas] Erro:', error);
        res.status(500).json({ error: 'Erro ao criar demanda de passagem.' });
    }
});

// Atualizar status (Autorização/Emissão)
demandasPassagensRouter.patch('/:id/status', authorize('REGULACAO', 'SEC_ADM'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const body = statusUpdateSchema.parse(req.body);
        const userId = req.user!.userId;

        const demandaOriginal = await prisma.demandaPassagemAerea.findUnique({
            where: { id: id as string },
            include: { processo: { include: { paciente: true } } }
        });

        if (!demandaOriginal) {
            return res.status(404).json({ error: 'Demanda não encontrada.' });
        }

        // Se estiver autorizando, marca quem autorizou
        const updateData: any = { status: body.status };
        if (body.status === 'AUTORIZADO') {
            updateData.autorizadoPorId = userId;
        }
        if (body.pnr) updateData.pnr = body.pnr;
        if (body.companhiaAerea) updateData.companhiaAerea = body.companhiaAerea;
        if (body.valorTotal) updateData.valorTotal = body.valorTotal;

        const demanda = await prisma.demandaPassagemAerea.update({
            where: { id: id as string },
            data: updateData,
            include: {
                processo: { include: { paciente: true } },
                autorizadoPor: { select: { nome: true } }
            }
        });

        await logAction({
            req,
            acao: 'UPDATE',
            entidade: 'PROCESSO',
            entidadeId: demanda.processoId,
            detalhes: `Status da passagem aérea de ${demanda.processo.paciente.nome} alterado para ${body.status}.`
        });

        res.json(demanda);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Dados inválidos.', details: error.errors });
        }
        console.error('[PATCH /passagens-aereas/:id/status] Erro:', error);
        res.status(500).json({ error: 'Erro ao atualizar demanda de passagem.' });
    }
});

// Detalhes de uma demanda
demandasPassagensRouter.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const demanda = await prisma.demandaPassagemAerea.findUnique({
            where: { id: id as string },
            include: {
                processo: {
                    include: {
                        paciente: true,
                        unidadeOrigem: true,
                    }
                },
                solicitadoPor: { select: { nome: true } },
                autorizadoPor: { select: { nome: true } },
            }
        });

        if (!demanda) {
            return res.status(404).json({ error: 'Demanda não encontrada.' });
        }

        res.json(demanda);
    } catch (error) {
        console.error('[GET /passagens-aereas/:id] Erro:', error);
        res.status(500).json({ error: 'Erro ao buscar detalhes da demanda.' });
    }
});

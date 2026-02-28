import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma, selectUsuarioPublico } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { StatusProcesso } from '@prisma/client';
import { logAction } from '../lib/logger';

export const processosRouter = Router();
processosRouter.use(authenticate);

const processoSchema = z.object({
    pacienteId: z.string().uuid(),
    unidadeOrigemId: z.string().uuid(),
    especialidade: z.string().min(3),
    cid: z.string().min(3),
    descricaoClinica: z.string().min(10),
    medicoSolicitante: z.string().min(3),
    crmMedico: z.string().optional(),
    dataConsulta: z.string().optional().transform(v => v ? new Date(v) : undefined),
    cidadeDestino: z.string().min(2),
    ufDestino: z.string().length(2),
    hospitalDestino: z.string().optional(),
    medicoDestino: z.string().optional(),
    tipoTransporte: z.enum(['ONIBUS', 'VAN', 'AMBULANCIA', 'AEREO', 'PROPRIO']),
    acompanhante: z.boolean().default(false),
    nomeAcompanhante: z.string().optional(),
    cpfAcompanhante: z.string().optional(),
    prioridade: z.number().int().min(1).max(3).default(1),
    observacoes: z.string().optional(),
});

async function gerarNumero(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.processoTFD.count({
        where: { numero: { startsWith: `TFD-${year}-` } },
    });
    return `TFD-${year}-${String(count + 1).padStart(5, '0')}`;
}

// Endpoint para listar especialidades únicas
processosRouter.get('/especialidades', authenticate, async (req: Request, res: Response) => {
    const especialidades = await prisma.processoTFD.groupBy({
        by: ['especialidade'],
        _count: { id: true },
        orderBy: { especialidade: 'asc' }
    });
    res.json(especialidades.map((e: any) => e.especialidade));
});

processosRouter.get('/', async (req: Request, res: Response) => {
    const { search, status, prioridade, unidadeId, page = '1', limit = '20' } = req.query;
    const perfil = req.user!.perfil;
    const userId = req.user!.userId;
    const skip = (Number(page) - 1) * Number(limit);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (perfil === 'UBS') {
        const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
        if (usuario?.unidadeId) where.unidadeOrigemId = usuario.unidadeId;
    }

    if (status) {
        if (String(status).includes(',')) {
            where.status = { in: String(status).split(',') };
        } else {
            where.status = status;
        }
    }
    if (prioridade) where.prioridade = Number(prioridade);
    if (unidadeId) where.unidadeOrigemId = unidadeId;
    if (search) {
        where.OR = [
            { numero: { contains: String(search), mode: 'insensitive' } },
            { paciente: { nome: { contains: String(search), mode: 'insensitive' } } },
            { especialidade: { contains: String(search), mode: 'insensitive' } },
        ];
    }

    const orderBy: any[] = [];
    if (req.query.sort === 'fila') {
        orderBy.push({ prioridade: 'desc' });
        orderBy.push({ createdAt: 'asc' }); // FIFO - mais antigo primeiro
    } else {
        orderBy.push({ prioridade: 'desc' });
        orderBy.push({ createdAt: 'desc' }); // LIFO - mais novo primeiro (padrão listagem)
    }

    const [total, processos] = await Promise.all([
        prisma.processoTFD.count({ where }),
        prisma.processoTFD.findMany({
            where,
            skip,
            take: Number(limit),
            orderBy,
            include: {
                paciente: { select: { id: true, nome: true, cpf: true } },
                unidadeOrigem: { select: { id: true, nome: true, cnes: true } },
                abertoPor: { select: selectUsuarioPublico },
                reguladoPor: { select: selectUsuarioPublico },
            },
        }),
    ]);

    res.json({ total, page: Number(page), processos });
});

processosRouter.get('/:id', async (req: Request, res: Response) => {
    const processo = await prisma.processoTFD.findUnique({
        where: { id: req.params.id as string },
        include: {
            paciente: true,
            unidadeOrigem: true,
            abertoPor: { select: selectUsuarioPublico },
            reguladoPor: { select: selectUsuarioPublico },
            historico: {
                orderBy: { createdAt: 'desc' },
                include: { usuario: { select: selectUsuarioPublico } },
            },
            documentos: true,
            passagens: true,
        },
    });
    if (!processo) { res.status(404).json({ error: 'Processo não encontrado.' }); return; }
    res.json(processo);
});

processosRouter.post('/', authorize('UBS', 'ATENDENTE', 'SEC_ADM'), async (req: Request, res: Response) => {
    try {
        const data = processoSchema.parse(req.body);
        const numero = await gerarNumero();

        const processo = await prisma.processoTFD.create({
            data: {
                ...data,
                numero,
                abertoPorId: req.user!.userId,
                status: 'PENDENTE',
            },
        });

        await logAction({
            req,
            acao: 'CREATE',
            entidade: 'PROCESSO',
            entidadeId: processo.id,
            detalhes: `Processo ${processo.numero} criado.`
        });

        await prisma.historicoProcesso.create({
            data: {
                processoId: processo.id,
                usuarioId: req.user!.userId,
                statusNovo: 'PENDENTE',
                descricao: 'Processo criado e encaminhado para regulação.',
            },
        });

        res.status(201).json(processo);
    } catch (err) {
        if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
        throw err;
    }
});

processosRouter.put('/:id', authorize('REGULACAO', 'SEC_ADM', 'ATENDENTE'), async (req: Request, res: Response) => {
    try {
        const data = processoSchema.partial().parse(req.body);
        const processo = await prisma.processoTFD.update({
            where: { id: req.params.id as string },
            data,
        });

        await logAction({
            req,
            acao: 'UPDATE',
            entidade: 'PROCESSO',
            entidadeId: processo.id,
            detalhes: `Processo ${processo.numero} editado.`
        });

        res.json(processo);
    } catch (err) {
        if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
        throw err;
    }
});

const transicaoSchema = z.object({
    statusNovo: z.nativeEnum(StatusProcesso),
    descricao: z.string().min(3),
    dataAgendada: z.string().optional().transform(v => v ? new Date(v) : undefined),
    localAtendimento: z.string().optional(),
    motivoNegativa: z.string().optional(),
});

processosRouter.patch('/:id/status', authorize('REGULACAO', 'SEC_ADM'), async (req: Request, res: Response) => {
    try {
        const { statusNovo, descricao, dataAgendada, localAtendimento, motivoNegativa } = transicaoSchema.parse(req.body);
        const processo = await prisma.processoTFD.findUnique({ where: { id: req.params.id as string } });
        if (!processo) { res.status(404).json({ error: 'Processo não encontrado.' }); return; }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = { status: statusNovo };
        if (dataAgendada) updateData.dataAgendada = dataAgendada;
        if (localAtendimento) updateData.localAtendimento = localAtendimento;
        if (motivoNegativa) updateData.motivoNegativa = motivoNegativa;
        if (['EM_ANALISE', 'APROVADO', 'NEGADO'].includes(statusNovo)) {
            updateData.reguladoPorId = req.user!.userId;
        }

        const [processoAtualizado] = await prisma.$transaction([
            prisma.processoTFD.update({ where: { id: req.params.id as string }, data: updateData }),
            prisma.historicoProcesso.create({
                data: {
                    processoId: req.params.id as string,
                    usuarioId: req.user!.userId,
                    statusAnterior: processo.status,
                    statusNovo,
                    descricao,
                },
            }),
        ]);

        await logAction({
            req,
            acao: 'UPDATE',
            entidade: 'PROCESSO',
            entidadeId: (req.params.id as string),
            detalhes: `Status alterado de ${processo.status} para ${statusNovo}.`
        });

        res.json(processoAtualizado);
    } catch (err) {
        if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
        throw err;
    }
});

processosRouter.post('/:id/passagens', authorize('REGULACAO', 'SEC_ADM', 'ATENDENTE'), async (req: Request, res: Response) => {
    const schema = z.object({
        tipo: z.enum(['IDA', 'VOLTA']),
        dataViagem: z.string().transform(v => new Date(v)),
        numeroPassagem: z.string().optional(),
        empresa: z.string().optional(),
        valor: z.number().optional(),
        observacoes: z.string().optional(),
    });
    try {
        const data = schema.parse(req.body);
        const passagem = await prisma.passagem.create({ data: { ...data, processoId: req.params.id as string } });
        res.status(201).json(passagem);
    } catch (err) {
        if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
        throw err;
    }
});

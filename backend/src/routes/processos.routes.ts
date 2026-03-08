import { Router, Request, Response } from 'express';
import path from 'path';
import { upload } from '../lib/upload';
import { z } from 'zod';
import { prisma, selectUsuarioPublico } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { StatusProcesso } from '@prisma/client';
import { logAction } from '../lib/logger';
import { Prisma } from '@prisma/client';

export const processosRouter = Router();
processosRouter.use(authenticate);

// Helper para obter query params como string
function getQueryParam(query: Request['query'], key: string): string | undefined {
    const value = query[key];
    if (typeof value === 'object' && value !== null) return undefined;
    return Array.isArray(value) ? value[0] : value;
}

// Helper para obter params como string
function getParam(params: Request['params'], key: string): string {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}

// Upload de documento
// Upload de documento
interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

processosRouter.post('/:id/documentos', authorize('UBS', 'ATENDENTE', 'SEC_ADM', 'REGULACAO'), upload.single('file'), async (req: Request, res: Response) => {
    const multerReq = req as MulterRequest;
    const processoId = getParam(req.params, 'id');
    const { tipo } = req.body;
    if (!multerReq.file) return res.status(400).json({ error: 'Arquivo não enviado.' });
    const processo = await prisma.processoTFD.findUnique({ where: { id: processoId } });
    if (!processo) return res.status(404).json({ error: 'Processo não encontrado.' });
    const url = `/uploads/${multerReq.file.filename}`;
    const documento = await prisma.documento.create({
        data: {
            processoId,
            nome: multerReq.file.originalname,
            tipo: tipo || 'outro',
            url,
        }
    });
    // Usar valores válidos para acao e entidade
    await logAction({ req, acao: 'CREATE', entidade: 'PROCESSO', entidadeId: documento.id, detalhes: `Documento anexado ao processo ${processo.numero}` });
    res.status(201).json(documento);
});

const processoSchema = z.object({
    pacienteId: z.string().uuid(),
    unidadeOrigemId: z.string().uuid(),
    especialidade: z.string().min(3),
    cid: z.string().min(3),
    descricaoClinica: z.string().min(10),
    medicoSolicitante: z.string().min(3),
    crmMedico: z.string().optional(),
    medicoId: z.string().uuid().optional(),
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
    const search = getQueryParam(req.query, 'search');
    const status = getQueryParam(req.query, 'status');
    const prioridade = getQueryParam(req.query, 'prioridade');
    const unidadeId = getQueryParam(req.query, 'unidadeId');
    const page = getQueryParam(req.query, 'page') || '1';
    const limit = getQueryParam(req.query, 'limit') || '20';
    const perfil = req.user!.perfil;
    const userId = req.user!.userId;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.ProcessoTFDWhereInput = {};

    if (perfil === 'UBS') {
        const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
        if (usuario?.unidadeId) where.unidadeOrigemId = usuario.unidadeId;
    }

    if (status) {
        if (status.includes(',')) {
            where.status = { in: status.split(',') as StatusProcesso[] };
        } else {
            where.status = status as StatusProcesso;
        }
    }
    if (prioridade) where.prioridade = Number(prioridade);
    if (unidadeId) where.unidadeOrigemId = unidadeId;
    if (search) {
        where.OR = [
            { numero: { contains: search, mode: 'insensitive' } },
            { paciente: { nome: { contains: search, mode: 'insensitive' } } },
            { especialidade: { contains: search, mode: 'insensitive' } },
        ];
    }

    const orderBy: Prisma.ProcessoTFDOrderByWithRelationInput[] = [];
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
        where: { id: getParam(req.params, 'id') },
        include: {
            paciente: true,
            unidadeOrigem: true,
            abertoPor: { select: selectUsuarioPublico },
            reguladoPor: { select: selectUsuarioPublico },
            medico: true,
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
        const processoAntigo = await prisma.processoTFD.findUnique({ where: { id: getParam(req.params, 'id') } });
        if (!processoAntigo) { res.status(404).json({ error: 'Processo não encontrado.' }); return; }

        const processo = await prisma.processoTFD.update({
            where: { id: getParam(req.params, 'id') },
            data,
        });

        // Registrar no histórico se o destino mudou
        if ((data.cidadeDestino && data.cidadeDestino !== processoAntigo.cidadeDestino) ||
            (data.ufDestino && data.ufDestino !== processoAntigo.ufDestino)) {
            await prisma.historicoProcesso.create({
                data: {
                    processoId: processo.id,
                    usuarioId: req.user!.userId,
                    statusAnterior: processo.status,
                    statusNovo: processo.status,
                    descricao: `Cidade de destino alterada de ${processoAntigo.cidadeDestino}-${processoAntigo.ufDestino} para ${processo.cidadeDestino}-${processo.ufDestino}.`,
                },
            });
        }

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
        const processo = await prisma.processoTFD.findUnique({ where: { id: getParam(req.params, 'id') } });
        if (!processo) { res.status(404).json({ error: 'Processo não encontrado.' }); return; }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = { status: statusNovo };
        if (dataAgendada) updateData.dataAgendada = dataAgendada;
        if (localAtendimento) updateData.localAtendimento = localAtendimento;
        if (motivoNegativa) updateData.motivoNegativa = motivoNegativa;
        if (['EM_ANALISE', 'APROVADO', 'NEGADO'].includes(statusNovo)) {
            updateData.reguladoPorId = req.user!.userId;
        }

        const processoId = getParam(req.params, 'id');
        const [processoAtualizado] = await prisma.$transaction([
            prisma.processoTFD.update({ where: { id: processoId }, data: updateData }),
            prisma.historicoProcesso.create({
                data: {
                    processoId,
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
            entidadeId: processoId,
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
        const passagem = await prisma.passagem.create({ data: { ...data, processoId: getParam(req.params, 'id') } });
        res.status(201).json(passagem);
    } catch (err) {
        if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
        throw err;
    }
});

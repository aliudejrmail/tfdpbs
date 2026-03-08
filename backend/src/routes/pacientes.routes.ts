import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/logger';

export const pacientesRouter = Router();
pacientesRouter.use(authenticate);

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

const pacienteSchema = z.object({
    nome: z.string().min(3),
    cpf: z.string().length(11),
    dataNascimento: z.string().transform(v => new Date(v)),
    sexo: z.enum(['MASCULINO', 'FEMININO']),
    nomeMae: z.string().min(3),
    telefone: z.string().optional(),
    endereco: z.string(),
    bairro: z.string(),
    cidade: z.string(),
    uf: z.string().length(2).default('AM'),
    cep: z.string().optional(),
    cartaoSus: z.string().optional(),
});

// List
pacientesRouter.get('/', async (req: Request, res: Response) => {
    const search = getQueryParam(req.query, 'search');
    const page = getQueryParam(req.query, 'page') || '1';
    const limit = getQueryParam(req.query, 'limit') || '20';
    const skip = (Number(page) - 1) * Number(limit);
    const where = search
        ? {
            OR: [
                { nome: { contains: search, mode: 'insensitive' as const } },
                { cpf: { contains: search } },
                { cartaoSus: { contains: search } },
            ],
        }
        : {};
    const [total, pacientes] = await Promise.all([
        prisma.paciente.count({ where }),
        prisma.paciente.findMany({ where, skip, take: Number(limit), orderBy: { nome: 'asc' } }),
    ]);
    res.json({ total, page: Number(page), pacientes });
});

// Get by ID
pacientesRouter.get('/:id', async (req: Request, res: Response) => {
    const paciente = await prisma.paciente.findUnique({ where: { id: getParam(req.params, 'id') } });
    if (!paciente) { res.status(404).json({ error: 'Paciente não encontrado.' }); return; }
    res.json(paciente);
});

// Create
pacientesRouter.post('/', authorize('UBS', 'ATENDENTE', 'SEC_ADM'), async (req: Request, res: Response) => {
    try {
        const data = pacienteSchema.parse(req.body);
        const paciente = await prisma.paciente.create({ data });

        await logAction({
            req,
            acao: 'CREATE',
            entidade: 'PACIENTE',
            entidadeId: paciente.id,
            detalhes: `Paciente ${paciente.nome} criado.`
        });

        res.status(201).json(paciente);
    } catch (err) {
        if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
        throw err;
    }
});

// Update
pacientesRouter.put('/:id', authorize('UBS', 'ATENDENTE', 'SEC_ADM'), async (req: Request, res: Response) => {
    try {
        const data = pacienteSchema.partial().parse(req.body);
        const paciente = await prisma.paciente.update({ where: { id: getParam(req.params, 'id') }, data });

        await logAction({
            req,
            acao: 'UPDATE',
            entidade: 'PACIENTE',
            entidadeId: paciente.id,
            detalhes: `Dados do paciente ${paciente.nome} atualizados.`
        });

        res.json(paciente);
    } catch (err) {
        if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
        throw err;
    }
});

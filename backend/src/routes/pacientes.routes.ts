import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/logger';

export const pacientesRouter = Router();
pacientesRouter.use(authenticate);

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
    const { search, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = search
        ? {
            OR: [
                { nome: { contains: String(search), mode: 'insensitive' as const } },
                { cpf: { contains: String(search) } },
                { cartaoSus: { contains: String(search) } },
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
    const paciente = await prisma.paciente.findUnique({ where: { id: req.params.id as string } });
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
        const paciente = await prisma.paciente.update({ where: { id: req.params.id as string }, data });

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

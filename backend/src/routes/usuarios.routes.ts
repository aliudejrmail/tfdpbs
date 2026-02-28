import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

export const usuariosRouter = Router();
usuariosRouter.use(authenticate);

const usuarioSchema = z.object({
    nome: z.string().min(3),
    login: z.string().min(3),
    senha: z.string().min(6).optional(),
    perfil: z.enum(['UBS', 'REGULACAO', 'SEC_ADM', 'ATENDENTE']),
    unidadeId: z.string().uuid().optional().nullable(),
});

const selectSemSenha = {
    id: true,
    nome: true,
    login: true,
    perfil: true,
    ativo: true,
    unidadeId: true,
    createdAt: true,
    updatedAt: true,
    unidade: true,
};

// Only SEC_ADM can manage users
usuariosRouter.get('/', authorize('SEC_ADM'), async (_req: Request, res: Response) => {
    const usuarios = await prisma.usuario.findMany({
        orderBy: { nome: 'asc' },
        select: selectSemSenha,
    });
    res.json(usuarios);
});

usuariosRouter.post('/', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    try {
        const data = usuarioSchema.required({ senha: true } as { senha: true }).parse(req.body);
        const hash = await bcrypt.hash(data.senha as string, 10);
        const usuario = await prisma.usuario.create({
            data: { ...data, senha: hash },
            select: selectSemSenha,
        });
        res.status(201).json(usuario);
    } catch (err) {
        if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
        throw err;
    }
});

usuariosRouter.put('/:id', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    try {
        const data = usuarioSchema.partial().parse(req.body);
        const update: Record<string, unknown> = { ...data };
        if (data.senha) update.senha = await bcrypt.hash(data.senha, 10);
        const usuario = await prisma.usuario.update({
            where: { id: req.params.id as string },
            data: update,
            select: selectSemSenha,
        });
        res.json(usuario);
    } catch (err) {
        if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
        throw err;
    }
});

usuariosRouter.patch('/:id/toggle-ativo', authorize('SEC_ADM'), async (req: Request, res: Response) => {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.params.id as string } });
    if (!usuario) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }
    const updated = await prisma.usuario.update({
        where: { id: req.params.id as string },
        data: { ativo: !usuario.ativo },
        select: selectSemSenha,
    });
    res.json(updated);
});

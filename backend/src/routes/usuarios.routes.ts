import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/logger';
import { validatePassword, validarCPF } from '../utils/validation';

export const usuariosRouter = Router();
usuariosRouter.use(authenticate);

// Helper para obter params como string
function getParam(params: Request['params'], key: string): string {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}

const usuarioSchema = z.object({
    nome: z.string().min(3),
    login: z.string().min(3),
    senha: z.string()
        .min(8, 'Senha deve ter no mínimo 8 caracteres')
        .refine(
            (s) => /[A-Z]/.test(s),
            'Senha deve conter pelo menos uma letra maiúscula'
        )
        .refine(
            (s) => /[a-z]/.test(s),
            'Senha deve conter pelo menos uma letra minúscula'
        )
        .refine(
            (s) => /[0-9]/.test(s),
            'Senha deve conter pelo menos um número'
        )
        .refine(
            (s) => /[^A-Za-z0-9]/.test(s),
            'Senha deve conter pelo menos um caractere especial'
        )
        .optional(),
    perfil: z.enum(['UBS', 'REGULACAO', 'SEC_ADM', 'ATENDENTE']),
    unidadeId: z.string().uuid().optional().nullable(),
    ativo: z.boolean().optional(),
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

const senhaSchema = z.object({
    senhaAtual: z.string().min(1, 'Senha atual é obrigatória'),
    novaSenha: z.string()
        .min(8, 'Nova senha deve ter no mínimo 8 caracteres')
        .refine(
            (s) => /[A-Z]/.test(s),
            'Nova senha deve conter pelo menos uma letra maiúscula'
        )
        .refine(
            (s) => /[a-z]/.test(s),
            'Nova senha deve conter pelo menos uma letra minúscula'
        )
        .refine(
            (s) => /[0-9]/.test(s),
            'Nova senha deve conter pelo menos um número'
        )
        .refine(
            (s) => /[^A-Za-z0-9]/.test(s),
            'Nova senha deve conter pelo menos um caractere especial'
        ),
});

usuariosRouter.patch('/me/senha', async (req: Request, res: Response) => {
    console.log('[PATCH] /api/usuarios/me/senha hit');
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ error: 'Sessão inválida. Por favor, faça login novamente.' });
            return;
        }

        const { senhaAtual, novaSenha } = senhaSchema.parse(req.body);

        const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
        if (!usuario) {
            res.status(404).json({ error: 'Usuário não encontrado no banco de dados.' });
            return;
        }

        const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
        if (!senhaValida) {
            res.status(400).json({ error: 'Senha atual incorreta.' });
            return;
        }

        const hash = await bcrypt.hash(novaSenha, 10);
        await prisma.usuario.update({
            where: { id: userId },
            data: { senha: hash },
        });

        await logAction({
            req,
            acao: 'UPDATE',
            entidade: 'USUARIO',
            entidadeId: userId,
            detalhes: 'Usuário alterou a própria senha.'
        });

        res.json({ message: 'Senha alterada com sucesso!' });
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors });
            return;
        }
        console.error('[usuarios/senha] Erro:', err);
        res.status(500).json({ error: 'Erro interno ao alterar senha.' });
    }
});

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

        const currentUsuario = await prisma.usuario.findUnique({ where: { id: getParam(req.params, 'id') } });
        if (!currentUsuario) {
            res.status(404).json({ error: 'Usuário não encontrado.' });
            return;
        }

        // Proteção para o usuário admin
        if (currentUsuario.login === 'admin') {
            if (data.login && data.login !== 'admin') {
                res.status(403).json({ error: 'O login do administrador não pode ser alterado.' });
                return;
            }
            if (data.ativo === false) {
                res.status(403).json({ error: 'O administrador não pode ser desativado.' });
                return;
            }
        }

        if (data.senha) update.senha = await bcrypt.hash(data.senha, 10);
        const usuario = await prisma.usuario.update({
            where: { id: getParam(req.params, 'id') },
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
    const usuario = await prisma.usuario.findUnique({ where: { id: getParam(req.params, 'id') } });
    if (!usuario) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }

    if (usuario.login === 'admin') {
        res.status(403).json({ error: 'O usuário administrador não pode ser desativado.' });
        return;
    }

    const updated = await prisma.usuario.update({
        where: { id: getParam(req.params, 'id') },
        data: { ativo: !usuario.ativo },
        select: selectSemSenha,
    });
    res.json(updated);
});

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logAction } from '../lib/logger';
import { validatePassword } from '../utils/validation';

export const authRouter = Router();

const loginSchema = z.object({
    login: z.string().min(1, 'Login é obrigatório'),
    senha: z.string().min(1, 'Senha é obrigatória'),
});

authRouter.post('/login', async (req: Request, res: Response) => {
    try {
        const { login, senha } = loginSchema.parse(req.body);

        const usuario = await prisma.usuario.findUnique({
            where: { login },
            include: { unidade: true },
        });

        if (!usuario || !usuario.ativo) {
            res.status(401).json({ error: 'Credenciais inválidas.' });
            return;
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            res.status(401).json({ error: 'Credenciais inválidas.' });
            return;
        }

        const token = jwt.sign(
            { userId: usuario.id, perfil: usuario.perfil, nome: usuario.nome },
            process.env.JWT_SECRET as string,
            { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as jwt.SignOptions['expiresIn'] }
        );

        const { senha: _senha, ...usuarioPublico } = usuario;

        await logAction({
            usuarioId: usuario.id,
            acao: 'LOGIN',
            entidade: 'USUARIO',
            entidadeId: usuario.id,
            detalhes: `Usuário ${usuario.login} realizou login no sistema.`,
            req
        });

        res.json({ token, usuario: usuarioPublico });
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors });
            return;
        }
        console.error('[auth/login] Erro:', err);
        throw err;
    }
});

authRouter.get('/me', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) { res.status(401).json({ error: 'Não autenticado.' }); return; }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
        const usuario = await prisma.usuario.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                nome: true,
                login: true,
                perfil: true,
                ativo: true,
                unidadeId: true,
                createdAt: true,
                updatedAt: true,
                unidade: true,
            },
        });
        if (!usuario) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }
        res.json(usuario);
    } catch {
        res.status(401).json({ error: 'Token inválido.' });
    }
});

// Endpoint para validar força da senha
authRouter.post('/validate-password', (req: Request, res: Response) => {
    try {
        const { password } = z.object({ password: z.string() }).parse(req.body);
        const result = validatePassword(password);
        
        if (result.valid) {
            res.json({ valid: true, message: 'Senha forte' });
        } else {
            res.status(400).json({ valid: false, errors: result.errors });
        }
    } catch (err) {
        if (err instanceof z.ZodError) {
            res.status(400).json({ error: err.errors });
            return;
        }
        throw err;
    }
});

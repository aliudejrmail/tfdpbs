import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Perfil } from '@prisma/client';

export interface JwtPayload {
    userId: string;
    perfil: Perfil;
    nome: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token não informado.' });
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
}

export function authorize(...perfis: Perfil[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado.' });
            return;
        }
        if (perfis.length > 0 && !perfis.includes(req.user.perfil)) {
            res.status(403).json({ error: 'Acesso negado. Perfil sem permissão.' });
            return;
        }
        next();
    };
}

import { Request, Response, NextFunction } from 'express';

export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    console.error(err.stack);
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({
        error: isDev ? err.message : 'Erro interno do servidor.',
        message: isDev ? err.message : undefined,
    });
}

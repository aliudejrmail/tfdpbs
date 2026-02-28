import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

export type PrismaInstance = PrismaClient;

export const prisma =
    global.prisma ||
    new PrismaClient({
        log: ['query', 'error', 'warn'],
    });

export const selectUsuarioPublico = { id: true, nome: true, perfil: true };

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

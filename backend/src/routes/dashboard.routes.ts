import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get('/', async (req: Request, res: Response) => {
    const perfil = req.user!.perfil;
    const userId = req.user!.userId;

    let whereBase: Record<string, unknown> = {};

    // UBS only sees their own unit's processes
    if (perfil === 'UBS') {
        const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
        if (usuario?.unidadeId) {
            whereBase = { unidadeOrigemId: usuario.unidadeId };
        }
    }

    const [total, pendentes, emAnalise, aprovados, negados, agendados, concluidos, cancelados] =
        await Promise.all([
            prisma.processoTFD.count({ where: whereBase }),
            prisma.processoTFD.count({ where: { ...whereBase, status: 'PENDENTE' } }),
            prisma.processoTFD.count({ where: { ...whereBase, status: 'EM_ANALISE' } }),
            prisma.processoTFD.count({ where: { ...whereBase, status: 'APROVADO' } }),
            prisma.processoTFD.count({ where: { ...whereBase, status: 'NEGADO' } }),
            prisma.processoTFD.count({ where: { ...whereBase, status: 'AGENDADO' } }),
            prisma.processoTFD.count({ where: { ...whereBase, status: 'CONCLUIDO' } }),
            prisma.processoTFD.count({ where: { ...whereBase, status: 'CANCELADO' } }),
        ]);

    const recentes = await prisma.processoTFD.findMany({
        where: whereBase,
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { paciente: true, unidadeOrigem: true },
    });

    res.json({
        stats: { total, pendentes, emAnalise, aprovados, negados, agendados, concluidos, cancelados },
        recentes,
    });
});

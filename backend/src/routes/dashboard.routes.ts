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

    // Calcular tempo médio de aprovação (em dias)
    const processosAprovados = await prisma.processoTFD.findMany({
        where: {
            ...whereBase,
            status: 'APROVADO',
            createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 3)) }
        },
        select: { createdAt: true, updatedAt: true }
    });

    let tempoMedioAprovacao = 0;
    if (processosAprovados.length > 0) {
        const totalDias = processosAprovados.reduce((acc, p) => {
            const diff = new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime();
            return acc + (diff / (1000 * 60 * 60 * 24));
        }, 0);
        tempoMedioAprovacao = Math.round(totalDias / processosAprovados.length);
    }

    // Ranking de unidades que mais solicitam
    const rankingUnidades = await prisma.unidade.findMany({
        include: {
            processos: {
                where: {
                    createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) }
                },
                select: { id: true }
            }
        },
        orderBy: {
            processos: {
                _count: 'desc'
            }
        },
        take: 5
    });

    // Processos por especialidade (últimos 30 dias)
    const especialidadesCount = await prisma.processoTFD.groupBy({
        by: ['especialidade'],
        where: {
            ...whereBase,
            createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) }
        },
        _count: { id: true },
        orderBy: {
            _count: { id: 'desc' }
        },
        take: 5
    });

    res.json({
        stats: { total, pendentes, emAnalise, aprovados, negados, agendados, concluidos, cancelados },
        recentes,
        metricas: {
            tempoMedioAprovacao,
            processosAprovadosMes: processosAprovados.length,
            rankingUnidades: rankingUnidades.map(u => ({
                nome: u.nome,
                cnes: u.cnes,
                total: u.processos.length
            })),
            especialidadesTop: especialidadesCount.map(e => ({
                especialidade: e.especialidade,
                total: e._count.id
            }))
        }
    });
});

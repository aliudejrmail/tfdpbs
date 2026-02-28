import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const publicRouter = Router();

/**
 * Consulta pública de status de processo TFD
 * Permite que o paciente acompanhe seu pedido sem login
 */
publicRouter.get('/consulta', async (req: Request, res: Response) => {
    const { identificador } = req.query;

    if (!identificador) {
        return res.status(400).json({ error: 'Identificador (CPF ou Número do Processo) é obrigatório.' });
    }

    const valorOriginal = String(identificador);
    const valorLimpo = valorOriginal.replace(/\D/g, ''); // CPF sem pontuação

    const processo = await prisma.processoTFD.findFirst({
        where: {
            OR: [
                { numero: valorOriginal },
                { paciente: { cpf: valorLimpo } }
            ]
        },
        include: {
            paciente: { select: { nome: true } },
            unidadeOrigem: { select: { nome: true } },
        },
        orderBy: { createdAt: 'desc' }
    });

    if (!processo) {
        return res.status(404).json({ error: 'Nenhum processo encontrado para este identificador.' });
    }

    // Retorna apenas dados não sensíveis para consulta pública
    res.json({
        numero: processo.numero,
        paciente: processo.paciente.nome,
        unidadeOrigem: processo.unidadeOrigem.nome,
        especialidade: processo.especialidade,
        status: processo.status,
        dataAgendada: processo.dataAgendada,
        localAtendimento: processo.localAtendimento,
        motivoNegativa: processo.status === 'NEGADO' ? processo.motivoNegativa : undefined,
        updatedAt: processo.updatedAt,
    });
});

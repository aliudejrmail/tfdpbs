import { Request } from 'express';
import { prisma } from './prisma';

type Acao = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
type Entidade = 'PACIENTE' | 'PROCESSO' | 'USUARIO' | 'UNIDADE' | 'MEDICO' | 'LINHA' | 'VEICULO' | 'MOTORISTA' | 'VIAGEM' | 'DIARIA' | 'AJUDA_CUSTO' | 'VALE_HOSPEDAGEM' | 'CASA_APOIO' | 'DOCUMENTO' | 'PASSAGEM' | 'DEMANDA_PASSAGEM_AEREA' | 'EMPRESA_TRANSPORTE';

interface LogData {
    req?: Request;
    usuarioId?: string;
    acao: Acao;
    entidade: Entidade;
    entidadeId?: string;
    detalhes?: string;
}

/**
 * Registra uma ação no sistema de auditoria
 */
export async function logAction({ req, usuarioId, acao, entidade, entidadeId, detalhes }: LogData) {
    try {
        const id = usuarioId || req?.user?.userId;
        const ip = req?.ip || req?.socket.remoteAddress;

        await prisma.log.create({
            data: {
                usuarioId: id,
                acao,
                entidade,
                entidadeId,
                detalhes,
                ip,
            },
        });
    } catch (err) {
        console.error('Falha ao registrar log de auditoria:', err);
    }
}

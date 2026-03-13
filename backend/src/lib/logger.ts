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

// Campos sensíveis que devem ser ocultados nos logs
const sensitiveFields = [
    'senha', 'password', 'token', 'cpf', 'cartaoSus', 'cartao_sus',
    'credit_card', 'cc_number', 'secret', 'private_key'
];

/**
 * Sanitiza dados sensíveis antes de registrar no log
 */
function sanitize(data: any, depth = 0): any {
    if (depth > 5) return '[REDACTED - Max depth]';
    
    if (data === null || data === undefined) return data;
    
    if (typeof data === 'string') {
        // Se for um campo sensível (verificado pelo contexto), ocultar
        return data;
    }
    
    if (Array.isArray(data)) {
        return data.map(item => sanitize(item, depth + 1));
    }
    
    if (typeof data === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(data)) {
            const keyLower = key.toLowerCase();
            if (sensitiveFields.some(field => keyLower.includes(field))) {
                sanitized[key] = '***REDACTED***';
            } else {
                sanitized[key] = sanitize(value, depth + 1);
            }
        }
        return sanitized;
    }
    
    return data;
}

/**
 * Sanitiza string de detalhes do log
 */
function sanitizeDetails(detalhes: string): string {
    if (!detalhes) return detalhes;
    
    // Pattern para CPF (11 dígitos ou formato XXX.XXX-XX)
    let sanitized = detalhes.replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '***.***.***-**');
    sanitized = sanitized.replace(/\b\d{11}\b/g, '***********');
    
    // Pattern para Cartão SUS (15 dígitos)
    sanitized = sanitized.replace(/\b\d{15}\b/g, '***************');
    
    return sanitized;
}

/**
 * Registra uma ação no sistema de auditoria
 */
export async function logAction({ req, usuarioId, acao, entidade, entidadeId, detalhes }: LogData) {
    try {
        const id = usuarioId || req?.user?.userId;
        const ip = req?.ip || req?.socket.remoteAddress;

        // Sanitizar detalhes antes de salvar
        const sanitizedDetalhes = detalhes ? sanitizeDetails(detalhes) : undefined;

        await prisma.log.create({
            data: {
                usuarioId: id,
                acao,
                entidade,
                entidadeId,
                detalhes: sanitizedDetalhes,
                ip,
            },
        });
    } catch (err) {
        // Não logar erro detalhado para evitar vazar informações sensíveis
        console.error('Falha ao registrar log de auditoria');
    }
}

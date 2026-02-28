import type { StatusProcesso } from '../types';

const labels: Record<StatusProcesso, string> = {
    PENDENTE: 'Pendente',
    EM_ANALISE: 'Em Análise',
    APROVADO: 'Aprovado',
    NEGADO: 'Negado',
    AGENDADO: 'Agendado',
    CONCLUIDO: 'Concluído',
    CANCELADO: 'Cancelado',
    RECURSO: 'Recurso',
};

export default function StatusBadge({ status }: { status: StatusProcesso }) {
    return <span className={`badge ${status}`}>{labels[status]}</span>;
}

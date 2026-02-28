export type Perfil = 'UBS' | 'REGULACAO' | 'SEC_ADM' | 'ATENDENTE';

export type StatusProcesso =
    | 'PENDENTE'
    | 'EM_ANALISE'
    | 'APROVADO'
    | 'NEGADO'
    | 'AGENDADO'
    | 'CONCLUIDO'
    | 'CANCELADO'
    | 'RECURSO';

export type TipoTransporte = 'ONIBUS' | 'VAN' | 'AMBULANCIA' | 'AEREO' | 'PROPRIO';

export interface Unidade {
    id: string;
    nome: string;
    cnes: string;
    tipo: string;
    ativo: boolean;
}

export interface Usuario {
    id: string;
    nome: string;
    login: string;
    perfil: Perfil;
    ativo: boolean;
    unidadeId?: string;
    unidade?: Unidade;
    createdAt: string;
}

export interface Paciente {
    id: string;
    nome: string;
    cpf: string;
    dataNascimento: string;
    sexo: 'MASCULINO' | 'FEMININO';
    nomeMae: string;
    telefone?: string;
    endereco: string;
    bairro: string;
    cidade: string;
    uf: string;
    cartaoSus?: string;
}

export interface ProcessoTFD {
    id: string;
    numero: string;
    pacienteId: string;
    paciente: Pick<Paciente, 'id' | 'nome' | 'cpf' | 'cartaoSus'>;
    unidadeOrigemId: string;
    unidadeOrigem: Pick<Unidade, 'id' | 'nome' | 'cnes'>;
    especialidade: string;
    cid: string;
    descricaoClinica: string;
    medicoSolicitante: string;
    crmMedico?: string;
    dataConsulta?: string;
    cidadeDestino: string;
    ufDestino: string;
    hospitalDestino?: string;
    medicoDestino?: string;
    tipoTransporte: TipoTransporte;
    acompanhante: boolean;
    nomeAcompanhante?: string;
    status: StatusProcesso;
    prioridade: number;
    dataAgendada?: string;
    localAtendimento?: string;
    observacoes?: string;
    motivoNegativa?: string;
    abertoPor: Pick<Usuario, 'id' | 'nome'>;
    reguladoPor?: Pick<Usuario, 'id' | 'nome'>;
    createdAt: string;
    updatedAt: string;
    historico?: HistoricoProcesso[];
    passagens?: Passagem[];
}

export interface HistoricoProcesso {
    id: string;
    statusAnterior?: StatusProcesso;
    statusNovo: StatusProcesso;
    descricao: string;
    createdAt: string;
    usuario: Pick<Usuario, 'id' | 'nome'>;
}

export interface Passagem {
    id: string;
    tipo: 'IDA' | 'VOLTA';
    dataViagem: string;
    numeroPassagem?: string;
    empresa?: string;
    valor?: number;
    observacoes?: string;
}

export interface DashboardStats {
    total: number;
    pendentes: number;
    emAnalise: number;
    aprovados: number;
    negados: number;
    agendados: number;
    concluidos: number;
    cancelados: number;
}

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

export interface Medico {
    id: string;
    nome: string;
    crm: string;
    especialidade?: string;
    ativo: boolean;
    unidadeId: string;
    unidade: { nome: string };
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
    cep?: string;
    cartaoSus?: string;
}

export interface EmpresaTransporte {
    id: string;
    nome: string;
    cnpj: string;
    ativo: boolean;
    tipo: string;
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
    medicoId?: string;
    medico?: Medico;
    crmMedico?: string;
    dataConsulta?: string;
    cidadeDestino: string;
    ufDestino: string;
    hospitalDestino?: string;
    medicoDestino?: string;
    tipoTransporte: TipoTransporte;
    transporteTerceirizado?: boolean;
    empresaTransporteId?: string;
    empresaTransporte?: EmpresaTransporte;
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
    documentos?: Documento[];
    viagens?: PassageiroViagem[];
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
    processoId: string;
    linhaId?: string;
    linha?: { id: string; nome: string; empresa?: string; origem: string; destino: string };
    tipo: 'IDA' | 'VOLTA';
    dataViagem: string;
    numeroPassagem?: string;
    empresa?: string;
    valor?: number;
    observacoes?: string;
    processo?: { id: string; numero: string; paciente: { nome: string; cpf: string } };
}

export interface Documento {
    id: string;
    processoId: string;
    nome: string;
    tipo: string;
    url: string;
    createdAt: string;
}

export interface Linha {
    id: string;
    nome: string;
    empresa?: string;
    origem: string;
    destino: string;
    horarios?: string;
    ativo: boolean;
}

export interface Viagem {
    id: string;
    dataPartida: string;
    dataRetorno?: string;
    veiculo?: { id: string; placa: string; modelo: string };
    motorista?: { id: string; nome: string };
    linha?: { id: string; nome: string };
    status: string;
}

export interface PassageiroViagem {
    id: string;
    viagem: Viagem;
    acompanhante: boolean;
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

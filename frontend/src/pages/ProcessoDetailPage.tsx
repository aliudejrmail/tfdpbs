import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { ProcessoTFD, StatusProcesso } from '../types';
import StatusBadge from '../components/StatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Clock, Plane, Ambulance, Bus, Car, X, FileText, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { gerarCapaProcesso, gerarProtocoloEntrega } from '../lib/pdfGenerator';

const STATUS_TRANSITIONS: Record<StatusProcesso, StatusProcesso[]> = {
    PENDENTE: ['EM_ANALISE', 'CANCELADO'],
    EM_ANALISE: ['APROVADO', 'NEGADO', 'RECURSO'],
    APROVADO: ['AGENDADO', 'CANCELADO'],
    AGENDADO: ['CONCLUIDO', 'CANCELADO'],
    NEGADO: ['RECURSO', 'CANCELADO'],
    RECURSO: ['EM_ANALISE', 'CANCELADO'],
    CONCLUIDO: [],
    CANCELADO: [],
};

const STATUS_LABELS: Record<StatusProcesso, string> = {
    PENDENTE: 'Definir como Pendente', EM_ANALISE: 'Iniciar Análise', APROVADO: 'Aprovar',
    NEGADO: 'Negar', AGENDADO: 'Agendar', CONCLUIDO: 'Concluir', CANCELADO: 'Cancelar', RECURSO: 'Recurso',
};

const transporteIcon = (tipo: string) => {
    const transporteIcon: Record<string, React.ReactNode> = {
        AEREO: <Plane size={14} />, AMBULANCIA: <Ambulance size={14} />, ONIBUS: <Bus size={14} />,
        VAN: <Car size={14} />, PROPRIO: <Car size={14} />,
    };
    return transporteIcon[tipo] || null;
};

const transporteLabel: Record<string, string> = {
    ONIBUS: 'Ônibus', VAN: 'Van', AMBULANCIA: 'Ambulância', AEREO: 'Aéreo', PROPRIO: 'Transporte Próprio',
};

export default function ProcessoDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [processo, setProcesso] = useState<ProcessoTFD | null>(null);
    const [loading, setLoading] = useState(true);
    const [showTransicao, setShowTransicao] = useState(false);
    const [novoStatus, setNovoStatus] = useState<StatusProcesso | ''>('');
    const [descricao, setDescricao] = useState('');
    const [dataAgendada, setDataAgendada] = useState('');
    const [localAtendimento, setLocalAtendimento] = useState('');
    const [motivoNegativa, setMotivoNegativa] = useState('');
    const [saving, setSaving] = useState(false);

    const canTransition = user?.perfil === 'REGULACAO' || user?.perfil === 'SEC_ADM';

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.get(`/processos/${id}`).then(r => setProcesso(r.data)).finally(() => setLoading(false));
    }, [id]);

    const handleTransicao = async () => {
        if (!novoStatus || !descricao) return;
        setSaving(true);
        try {
            await api.patch(`/processos/${id}/status`, {
                statusNovo: novoStatus,
                descricao,
                dataAgendada: dataAgendada || undefined,
                localAtendimento: localAtendimento || undefined,
                motivoNegativa: motivoNegativa || undefined,
            });
            toast.success('Status atualizado com sucesso!');
            const { data } = await api.get(`/processos/${id}`);
            setProcesso(data);
            setShowTransicao(false);
            setNovoStatus(''); setDescricao(''); setDataAgendada(''); setLocalAtendimento(''); setMotivoNegativa('');
        } catch {
            toast.error('Erro ao atualizar status.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="spinner-center"><div className="spinner" /></div>;
    if (!processo) return <div className="page"><p>Processo não encontrado.</p></div>;

    const transitions = STATUS_TRANSITIONS[processo.status] || [];

    return (
        <>
            <div className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn btn-icon btn-outline" onClick={() => navigate(-1)}><ArrowLeft size={16} /></button>
                    <div>
                        <h2 style={{ fontFamily: 'monospace' }}>{processo.numero}</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{processo.especialidade}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <StatusBadge status={processo.status} />
                    <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
                    <button className="btn btn-outline btn-sm" title="Gerar Capa em PDF" onClick={() => gerarCapaProcesso(processo)}>
                        <FileText size={14} />
                        Capa
                    </button>
                    <button className="btn btn-outline btn-sm" title="Gerar Protocolo em PDF" onClick={() => gerarProtocoloEntrega(processo)}>
                        <Printer size={14} />
                        Protocolo
                    </button>
                    {canTransition && transitions.length > 0 && (
                        <button className="btn btn-accent btn-sm" onClick={() => setShowTransicao(true)}>
                            <Clock size={14} />
                            Alterar Status
                        </button>
                    )}
                </div>
            </div>

            <div className="page" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                {/* Main */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Paciente */}
                    <div className="card">
                        <div className="card-title">Dados do Paciente</div>
                        <div className="detail-grid">
                            <div className="detail-item"><label>Nome</label><span>{processo.paciente?.nome}</span></div>
                            <div className="detail-item"><label>CPF</label><span>{processo.paciente?.cpf}</span></div>
                        </div>
                    </div>

                    {/* Clínico */}
                    <div className="card">
                        <div className="card-title">Informações Clínicas</div>
                        <div className="detail-grid" style={{ marginBottom: 12 }}>
                            <div className="detail-item"><label>Especialidade</label><span>{processo.especialidade}</span></div>
                            <div className="detail-item"><label>CID-10</label><span>{processo.cid}</span></div>
                            <div className="detail-item"><label>Médico Solicitante</label><span>{processo.medicoSolicitante}</span></div>
                            {processo.crmMedico && <div className="detail-item"><label>CRM</label><span>{processo.crmMedico}</span></div>}
                            <div className="detail-item"><label>Unidade Origem</label><span>{processo.unidadeOrigem?.nome}</span></div>
                            <div className="detail-item">
                                <label>Prioridade</label>
                                <span>
                                    <span className={`badge prioridade-${processo.prioridade}`}>
                                        {processo.prioridade === 1 ? 'Normal' : processo.prioridade === 2 ? 'Urgente' : 'Emergência'}
                                    </span>
                                </span>
                            </div>
                        </div>
                        <div className="detail-item">
                            <label>Descrição Clínica</label>
                            <span style={{ marginTop: 4, padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: 13, lineHeight: 1.7, display: 'block' }}>
                                {processo.descricaoClinica}
                            </span>
                        </div>
                    </div>

                    {/* Logística */}
                    <div className="card">
                        <div className="card-title">Logística</div>
                        <div className="detail-grid">
                            <div className="detail-item"><label>Destino</label><span>{processo.cidadeDestino} - {processo.ufDestino}</span></div>
                            {processo.hospitalDestino && <div className="detail-item"><label>Hospital</label><span>{processo.hospitalDestino}</span></div>}
                            <div className="detail-item">
                                <label>Transporte</label>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    {transporteIcon(processo.tipoTransporte)}
                                    {transporteLabel[processo.tipoTransporte]}
                                </span>
                            </div>
                            <div className="detail-item"><label>Acompanhante</label><span>{processo.acompanhante ? processo.nomeAcompanhante || 'Sim' : 'Não'}</span></div>
                            {processo.dataAgendada && (
                                <div className="detail-item">
                                    <label>Data Agendada</label>
                                    <span>{format(new Date(processo.dataAgendada), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                </div>
                            )}
                            {processo.localAtendimento && <div className="detail-item"><label>Local Atendimento</label><span>{processo.localAtendimento}</span></div>}
                        </div>
                        {processo.motivoNegativa && (
                            <div style={{ marginTop: 12 }}>
                                <div className="detail-item">
                                    <label style={{ color: 'var(--danger-light)' }}>Motivo da Negativa</label>
                                    <span style={{ color: 'var(--danger-light)', padding: '8px 12px', background: 'rgba(229,62,62,0.08)', borderRadius: 'var(--radius-sm)', display: 'block', marginTop: 4 }}>
                                        {processo.motivoNegativa}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar - Timeline */}
                <div>
                    <div className="card">
                        <div className="card-title">Histórico</div>
                        {processo.historico && processo.historico.length > 0 ? (
                            <div className="timeline">
                                {processo.historico.map(h => (
                                    <div className="timeline-item" key={h.id}>
                                        <div className="timeline-dot">
                                            <Clock size={12} color="var(--text-muted)" />
                                        </div>
                                        <div className="timeline-content">
                                            <div className="timeline-header">
                                                <StatusBadge status={h.statusNovo} />
                                                <span className="timeline-date">
                                                    {format(new Date(h.createdAt), 'dd/MM/yy HH:mm', { locale: ptBR })}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                por {h.usuario?.nome}
                                            </div>
                                            <div className="timeline-desc" style={{ marginTop: 4 }}>{h.descricao}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Sem histórico.</p>
                        )}
                    </div>

                    {processo.passagens && processo.passagens.length > 0 && (
                        <div className="card" style={{ marginTop: 16 }}>
                            <div className="card-title">Passagens</div>
                            {processo.passagens.map((p, index) => (
                                <div key={p.id} style={{ padding: '10px 0', borderBottom: index === (processo.passagens?.length || 0) - 1 ? 'none' : '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span className={`badge ${p.tipo === 'IDA' ? 'APROVADO' : 'AGENDADO'}`}>{p.tipo}</span>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {format(new Date(p.dataViagem), 'dd/MM/yyyy', { locale: ptBR })}
                                        </span>
                                    </div>
                                    {p.empresa && <div style={{ fontSize: 12, marginTop: 4 }}>{p.empresa} {p.numeroPassagem && `— ${p.numeroPassagem}`}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Status Transition Modal */}
            {showTransicao && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTransicao(false)}>
                    <div className="modal" style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <span className="modal-title">Alterar Status do Processo</span>
                            <button className="btn btn-icon btn-outline" onClick={() => setShowTransicao(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Novo Status</label>
                                <select className="form-control" value={novoStatus} onChange={e => setNovoStatus(e.target.value as StatusProcesso)}>
                                    <option value="">Selecione...</option>
                                    {transitions.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                                </select>
                            </div>

                            {novoStatus === 'AGENDADO' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Data Agendada</label>
                                        <input type="datetime-local" className="form-control" value={dataAgendada} onChange={e => setDataAgendada(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Local de Atendimento</label>
                                        <input className="form-control" value={localAtendimento} onChange={e => setLocalAtendimento(e.target.value)} />
                                    </div>
                                </>
                            )}

                            {novoStatus === 'NEGADO' && (
                                <div className="form-group">
                                    <label className="form-label">Motivo da Negativa</label>
                                    <textarea className="form-control" rows={3} value={motivoNegativa} onChange={e => setMotivoNegativa(e.target.value)} />
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Descrição / Observação</label>
                                <textarea className="form-control" rows={3} placeholder="Descreva a ação realizada..." value={descricao} onChange={e => setDescricao(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowTransicao(false)}>Cancelar</button>
                            <button className="btn btn-accent" onClick={handleTransicao} disabled={!novoStatus || !descricao || saving}>
                                {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

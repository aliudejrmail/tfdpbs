import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { ProcessoTFD, StatusProcesso, Passagem, Linha, EmpresaTransporte } from '../types';
import StatusBadge from '../components/StatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Clock, Plane, Ambulance, Bus, Car, X, FileText, Printer, UserPlus, Plus, Trash2, Edit2 } from 'lucide-react';
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
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
    const [showEditLogistica, setShowEditLogistica] = useState(false);
    const [editForm, setEditForm] = useState({ cidadeDestino: '', ufDestino: '', hospitalDestino: '', tipoTransporte: '' as any, transporteTerceirizado: false, empresaTransporteId: '' });
    const [showCadastrarMedico, setShowCadastrarMedico] = useState(false);
    const [medicoForm, setMedicoForm] = useState({ nome: '', crm: '', especialidade: '' });
    const [passagens, setPassagens] = useState<Passagem[]>([]);
    const [showPassagemModal, setShowPassagemModal] = useState(false);
    const [editingPassagem, setEditingPassagem] = useState<Passagem | null>(null);
    const [passagemForm, setPassagemForm] = useState({ tipo: 'IDA' as 'IDA' | 'VOLTA', dataViagem: '', numeroPassagem: '', empresa: '', valor: '', observacoes: '', linhaId: '' });
    const [linhas, setLinhas] = useState<Linha[]>([]);
    const [empresasTransporte, setEmpresasTransporte] = useState<EmpresaTransporte[]>([]);

    const canTransition = user?.perfil === 'REGULACAO' || user?.perfil === 'SEC_ADM';
    const canCadastrarMedico = user?.perfil === 'SEC_ADM' || user?.perfil === 'REGULACAO';

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        Promise.all([
            api.get(`/processos/${id}`),
            api.get('/passagens', { params: { processoId: id } }),
            api.get('/linhas-onibus', { params: { ativo: 'true' } }),
            api.get('/empresas-transporte', { params: { ativo: 'true' } })
        ]).then(([processoRes, passagensRes, linhasRes, empresasRes]) => {
            setProcesso(processoRes.data);
            setPassagens(passagensRes.data);
            setLinhas(linhasRes.data);
            setEmpresasTransporte(empresasRes.data);
        }).finally(() => setLoading(false));
    }, [id, showPassagemModal]);

    const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!fileInputRef.current?.files?.[0]) return;
        setUploading(true);
        setUploadError('');
        const formData = new FormData();
        formData.append('file', fileInputRef.current.files[0]);
        formData.append('tipo', 'anexo');
        try {
            await api.post(`/processos/${id}/documentos`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Arquivo anexado com sucesso!');
            fileInputRef.current.value = '';
        } catch (err: any) {
            setUploadError(err?.response?.data?.error || 'Erro ao enviar arquivo.');
            toast.error('Erro ao enviar arquivo.');
        } finally {
            setUploading(false);
        }
    };

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

    const handleEditLogistica = async () => {
        setSaving(true);
        try {
            await api.put(`/processos/${id}`, editForm);
            toast.success('Logística atualizada!');
            const { data } = await api.get(`/processos/${id}`);
            setProcesso(data);
            setShowEditLogistica(false);
        } catch {
            toast.error('Erro ao editar logística.');
        } finally {
            setSaving(false);
        }
    };

    const openEditLogistica = () => {
        if (!processo) return;
        setEditForm({
            cidadeDestino: processo.cidadeDestino,
            ufDestino: processo.ufDestino,
            hospitalDestino: processo.hospitalDestino || '',
            tipoTransporte: processo.tipoTransporte,
            transporteTerceirizado: processo.transporteTerceirizado || false,
            empresaTransporteId: processo.empresaTransporteId || '',
        });
        setShowEditLogistica(true);
    };

    const openCadastrarMedico = () => {
        if (!processo) return;
        setMedicoForm({
            nome: processo.medicoSolicitante || '',
            crm: processo.crmMedico || '',
            especialidade: processo.especialidade || '',
        });
        setShowCadastrarMedico(true);
    };

    const handleCadastrarMedico = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!processo?.unidadeOrigemId) {
            toast.error('Processo sem unidade de origem.');
            return;
        }
        setSaving(true);
        try {
            const { data: medico } = await api.post('/medicos', {
                ...medicoForm,
                unidadeId: processo.unidadeOrigemId,
            });
            await api.put(`/processos/${id}`, { medicoId: medico.id, medicoSolicitante: medicoForm.nome, crmMedico: medicoForm.crm });
            toast.success('Médico cadastrado e vinculado ao processo!');
            const { data } = await api.get(`/processos/${id}`);
            setProcesso(data);
            setShowCadastrarMedico(false);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao cadastrar médico.';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    // Passagens handlers
    const handleOpenPassagemModal = (passagem?: Passagem) => {
        if (passagem) {
            setEditingPassagem(passagem);
            setPassagemForm({
                tipo: passagem.tipo,
                dataViagem: format(new Date(passagem.dataViagem), 'yyyy-MM-dd HH:mm'),
                numeroPassagem: passagem.numeroPassagem || '',
                empresa: passagem.empresa || '',
                valor: passagem.valor?.toString() || '',
                observacoes: passagem.observacoes || '',
                linhaId: passagem.linhaId || ''
            });
        } else {
            setEditingPassagem(null);
            setPassagemForm({ tipo: 'IDA', dataViagem: '', numeroPassagem: '', empresa: '', valor: '', observacoes: '', linhaId: '' });
        }
        setShowPassagemModal(true);
    };

    const handleSavePassagem = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: any = {
                ...passagemForm,
                processoId: id,
                valor: passagemForm.valor ? parseFloat(passagemForm.valor) : undefined,
            };
            if (editingPassagem) {
                await api.put(`/passagens/${editingPassagem.id}`, payload);
                toast.success('Passagem atualizada!');
            } else {
                await api.post('/passagens', payload);
                toast.success('Passagem cadastrada!');
            }
            setShowPassagemModal(false);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao salvar passagem.';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePassagem = async (passagemId: string) => {
        if (!confirm('Tem certeza que deseja excluir esta passagem?')) return;
        try {
            await api.delete(`/passagens/${passagemId}`);
            toast.success('Passagem excluída!');
        } catch {
            toast.error('Erro ao excluir passagem.');
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
                    {/* Documentos */}
                    <div className="card">
                        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Anexos / Documentos
                        </div>
                        <div>
                            {processo?.documentos && processo.documentos.length > 0 ? (
                                <ul style={{ marginBottom: 12 }}>
                                    {processo.documentos.map(doc => (
                                        <li key={doc.id} style={{ marginBottom: 6 }}>
                                            <a href={`http://localhost:3333${doc.url}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2b6cb0', textDecoration: 'underline' }}>
                                                {doc.nome}
                                            </a>
                                            <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>({doc.tipo})</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Nenhum documento anexado.</span>
                            )}
                        </div>
                        <form onSubmit={handleFileUpload} style={{ marginTop: 8 }}>
                            <input ref={fileInputRef} type="file" accept=".pdf,image/jpeg,image/png" style={{ marginRight: 8 }} disabled={uploading} />
                            <button className="btn btn-accent btn-sm" type="submit" disabled={uploading}>
                                {uploading ? 'Enviando...' : 'Anexar Arquivo'}
                            </button>
                        </form>
                        {uploadError && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 4 }}>{uploadError}</div>}
                    </div>
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
                            <div className="detail-item">
                                <label>Médico Solicitante</label>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {processo.medico?.nome || processo.medicoSolicitante}
                                    {!processo.medico && processo.medicoSolicitante && canCadastrarMedico && (
                                        <button type="button" className="btn btn-sm btn-outline" onClick={openCadastrarMedico} title="Cadastrar médico no sistema">
                                            <UserPlus size={12} /> Cadastrar
                                        </button>
                                    )}
                                </span>
                            </div>
                            <div className="detail-item">
                                <label>CRM</label>
                                <span>{processo.medico?.crm || processo.crmMedico || '-'}</span>
                            </div>
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

                    <div className="card">
                        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Logística
                            {canTransition && (
                                <button className="btn btn-icon btn-outline" style={{ padding: 4 }} onClick={openEditLogistica} title="Editar Destino/Transporte">
                                    <FileText size={14} />
                                </button>
                            )}
                        </div>
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
                            {processo.transporteTerceirizado && processo.empresaTransporte && (
                                <div className="detail-item">
                                    <label>Empresa</label>
                                    <span>{processo.empresaTransporte.nome}</span>
                                </div>
                            )}
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

                    <div className="card" style={{ marginTop: 16 }}>
                        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Passagens
                            <button className="btn btn-accent btn-sm" onClick={() => handleOpenPassagemModal()}>
                                <Plus size={14} />
                                Nova Passagem
                            </button>
                        </div>
                        {passagens.length > 0 ? (
                            <div>
                                {passagens.map((p, index) => (
                                    <div key={p.id} style={{ padding: '10px 0', borderBottom: index === passagens.length - 1 ? 'none' : '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span className={`badge ${p.tipo === 'IDA' ? 'APROVADO' : 'AGENDADO'}`}>{p.tipo}</span>
                                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    {format(new Date(p.dataViagem), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                                </span>
                                            </div>
                                            {p.linha?.nome && <div style={{ fontSize: 12, marginTop: 4, fontWeight: 500 }}>{p.linha.nome}</div>}
                                            {(p.empresa || p.numeroPassagem) && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.empresa} {p.numeroPassagem && `— ${p.numeroPassagem}`}</div>}
                                            {p.valor && <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 2 }}>R$ {p.valor.toFixed(2)}</div>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-icon btn-outline btn-sm" onClick={() => handleOpenPassagemModal(p)} title="Editar">
                                                <Edit2 size={12} />
                                            </button>
                                            <button className="btn btn-icon btn-outline btn-sm" onClick={() => handleDeletePassagem(p.id)} title="Excluir">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Nenhuma passagem cadastrada.</p>
                        )}
                    </div>
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

            {/* Edit Logistica Modal */}
            {showEditLogistica && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEditLogistica(false)}>
                    <div className="modal" style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <span className="modal-title">Editar Destino e Transporte</span>
                            <button className="btn btn-icon btn-outline" onClick={() => setShowEditLogistica(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Cidade de Destino *</label>
                                <input className="form-control" value={editForm.cidadeDestino} onChange={e => setEditForm(f => ({ ...f, cidadeDestino: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">UF *</label>
                                <input className="form-control" maxLength={2} value={editForm.ufDestino} onChange={e => setEditForm(f => ({ ...f, ufDestino: e.target.value.toUpperCase() }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hospital/Local de Destino</label>
                                <input className="form-control" value={editForm.hospitalDestino} onChange={e => setEditForm(f => ({ ...f, hospitalDestino: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tipo de Transporte *</label>
                                <select className="form-control" value={editForm.tipoTransporte} onChange={e => setEditForm(f => ({ ...f, tipoTransporte: e.target.value }))}>
                                    <option value="ONIBUS">Ônibus</option>
                                    <option value="VAN">Van</option>
                                    <option value="AMBULANCIA">Ambulância</option>
                                    <option value="AEREO">Aéreo</option>
                                    <option value="PROPRIO">Transporte Próprio</option>
                                </select>
                            </div>

                            {(editForm.tipoTransporte === 'AMBULANCIA' || editForm.tipoTransporte === 'VAN') && (
                                <>
                                    <div className="form-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                                            <input type="checkbox" checked={editForm.transporteTerceirizado} onChange={e => setEditForm(f => ({ ...f, transporteTerceirizado: e.target.checked }))} />
                                            Transporte Terceirizado?
                                        </label>
                                    </div>
                                    {editForm.transporteTerceirizado && (
                                        <div className="form-group">
                                            <label className="form-label">Empresa de Transporte</label>
                                            <select className="form-control" value={editForm.empresaTransporteId} onChange={e => setEditForm(f => ({ ...f, empresaTransporteId: e.target.value }))}>
                                                <option value="">Selecione a empresa...</option>
                                                {empresasTransporte.filter(e => e.ativo && (e.tipo === editForm.tipoTransporte || e.tipo === 'TODOS')).map(e => (
                                                    <option key={e.id} value={e.id}>{e.nome}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowEditLogistica(false)}>Cancelar</button>
                            <button className="btn btn-accent" onClick={handleEditLogistica} disabled={saving}>
                                {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cadastrar Médico Modal */}
            {showCadastrarMedico && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCadastrarMedico(false)}>
                    <div className="modal" style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <span className="modal-title">Cadastrar Médico no Sistema</span>
                            <button className="btn btn-icon btn-outline" onClick={() => setShowCadastrarMedico(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleCadastrarMedico}>
                            <div className="modal-body">
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                                    O médico será cadastrado na unidade <strong>{processo?.unidadeOrigem?.nome}</strong> e vinculado a este processo.
                                </p>
                                <div className="form-group">
                                    <label className="form-label">Nome *</label>
                                    <input className="form-control" required minLength={3} value={medicoForm.nome} onChange={e => setMedicoForm(f => ({ ...f, nome: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">CRM *</label>
                                    <input className="form-control" required minLength={4} value={medicoForm.crm} onChange={e => setMedicoForm(f => ({ ...f, crm: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Especialidade</label>
                                    <input className="form-control" value={medicoForm.especialidade} onChange={e => setMedicoForm(f => ({ ...f, especialidade: e.target.value }))} placeholder="Opcional" />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowCadastrarMedico(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent" disabled={saving}>
                                    {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Cadastrar e Vincular'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Nova/Editar Passagem Modal */}
            {showPassagemModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPassagemModal(false)}>
                    <div className="modal" style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <span className="modal-title">{editingPassagem ? 'Editar Passagem' : 'Nova Passagem'}</span>
                            <button className="btn btn-icon btn-outline" onClick={() => setShowPassagemModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSavePassagem}>
                            <div className="modal-body">
                                <div className="form-row form-row-2">
                                    <div className="form-group">
                                        <label className="form-label">Tipo *</label>
                                        <select className="form-control" value={passagemForm.tipo} onChange={e => setPassagemForm(f => ({ ...f, tipo: e.target.value as 'IDA' | 'VOLTA' }))}>
                                            <option value="IDA">Ida</option>
                                            <option value="VOLTA">Volta</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Linha (Ônibus)</label>
                                        <select className="form-control" value={passagemForm.linhaId} onChange={e => setPassagemForm(f => ({ ...f, linhaId: e.target.value }))}>
                                            <option value="">Selecione...</option>
                                            {linhas.map(l => (
                                                <option key={l.id} value={l.id}>{l.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Data e Hora da Viagem *</label>
                                    <input type="datetime-local" className="form-control" required value={passagemForm.dataViagem} onChange={e => setPassagemForm(f => ({ ...f, dataViagem: e.target.value }))} />
                                </div>
                                <div className="form-row form-row-2">
                                    <div className="form-group">
                                        <label className="form-label">Empresa</label>
                                        <input className="form-control" value={passagemForm.empresa} onChange={e => setPassagemForm(f => ({ ...f, empresa: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Número da Passagem</label>
                                        <input className="form-control" value={passagemForm.numeroPassagem} onChange={e => setPassagemForm(f => ({ ...f, numeroPassagem: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Valor (R$)</label>
                                    <input type="number" step="0.01" className="form-control" value={passagemForm.valor} onChange={e => setPassagemForm(f => ({ ...f, valor: e.target.value }))} placeholder="0.00" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Observações</label>
                                    <textarea className="form-control" rows={3} value={passagemForm.observacoes} onChange={e => setPassagemForm(f => ({ ...f, observacoes: e.target.value }))} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowPassagemModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent" disabled={saving}>
                                    {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (editingPassagem ? 'Atualizar' : 'Cadastrar')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

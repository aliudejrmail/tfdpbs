import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { Plus, Calendar, Users as UsersIcon, Car, Bus, User, X, ChevronDown, ChevronUp, UserPlus, Trash2, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Paciente { id: string; nome: string; cpf: string; }
interface Processo { id: string; numero: string; paciente: Paciente; especialidade: string; cidadeDestino: string; }
interface Veiculo { id: string; placa: string; modelo: string; capacidade: number; }
interface Motorista { id: string; nome: string; cpf: string; }
interface Linha { id: string; nome: string; empresa?: string; origem: string; destino: string; }
interface PassageiroViagem { id: string; processo: Processo; acompanhante: boolean; }
interface Viagem {
    id: string;
    dataPartida: string;
    dataRetorno?: string;
    veiculo?: Veiculo;
    motorista?: Motorista;
    linha?: Linha;
    status: string;
    observacoes?: string;
    passageiros: PassageiroViagem[];
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    PLANEJADA: { label: 'Planejada', color: 'var(--info)', icon: Clock },
    EM_CURSO: { label: 'Em Curso', color: 'var(--warning)', icon: AlertCircle },
    CONCLUIDA: { label: 'Concluída', color: 'var(--success)', icon: CheckCircle2 },
    CANCELADA: { label: 'Cancelada', color: 'var(--danger)', icon: XCircle },
};

export default function ViagensPage() {
    const [viagens, setViagens] = useState<Viagem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showPassageiroModal, setShowPassageiroModal] = useState(false);
    const [selectedViagem, setSelectedViagem] = useState<Viagem | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState('');

    // Listas auxiliares
    const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
    const [motoristas, setMotoristas] = useState<Motorista[]>([]);
    const [linhas, setLinhas] = useState<Linha[]>([]);
    const [processosDisponiveis, setProcessosDisponiveis] = useState<Processo[]>([]);

    const [tipoViagem, setTipoViagem] = useState<'FROTA' | 'LINHA'>('FROTA');
    const [form, setForm] = useState({
        dataPartida: '',
        dataRetorno: '',
        veiculoId: '',
        motoristaId: '',
        linhaId: '',
        observacoes: '',
    });

    const fetchViagens = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterStatus) params.status = filterStatus;
            const { data } = await api.get('/viagens', { params });
            setViagens(data);
        } catch { toast.error('Erro ao carregar viagens.'); }
        finally { setLoading(false); }
    }, [filterStatus]);

    useEffect(() => { fetchViagens(); }, [fetchViagens]);

    const loadAuxData = async () => {
        try {
            const [v, m, l] = await Promise.all([
                api.get('/veiculos', { params: { ativo: 'true' } }),
                api.get('/motoristas', { params: { ativo: 'true' } }),
                api.get('/linhas-onibus', { params: { ativo: 'true' } }),
            ]);
            setVeiculos(v.data);
            setMotoristas(m.data);
            setLinhas(l.data);
        } catch { /* silent */ }
    };

    const loadProcessos = async () => {
        try {
            const { data } = await api.get('/viagens/processos/disponiveis');
            setProcessosDisponiveis(data);
        } catch { /* silent */ }
    };

    const handleOpenNew = async () => {
        await loadAuxData();
        setForm({ dataPartida: '', dataRetorno: '', veiculoId: '', motoristaId: '', linhaId: '', observacoes: '' });
        setTipoViagem('FROTA');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                dataPartida: form.dataPartida,
                observacoes: form.observacoes || undefined,
            };
            if (form.dataRetorno) payload.dataRetorno = form.dataRetorno;
            if (tipoViagem === 'FROTA') {
                payload.veiculoId = form.veiculoId || undefined;
                payload.motoristaId = form.motoristaId || undefined;
            } else {
                payload.linhaId = form.linhaId || undefined;
            }
            await api.post('/viagens', payload);
            toast.success('Viagem criada com sucesso!');
            setShowModal(false);
            fetchViagens();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao criar viagem.');
        }
    };

    const updateStatus = async (viagem: Viagem, newStatus: string) => {
        try {
            await api.patch(`/viagens/${viagem.id}/status`, { status: newStatus });
            toast.success(`Status alterado para ${statusConfig[newStatus]?.label || newStatus}.`);
            fetchViagens();
        } catch { toast.error('Erro ao alterar status.'); }
    };

    const handleAddPassageiro = async (processo: Processo, acompanhante: boolean) => {
        if (!selectedViagem) return;
        try {
            await api.post(`/viagens/${selectedViagem.id}/passageiros`, { processoId: processo.id, acompanhante });
            toast.success('Passageiro adicionado!');
            fetchViagens();
            // Refresh selected viagem
            const { data } = await api.get(`/viagens/${selectedViagem.id}`);
            setSelectedViagem(data);
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao adicionar passageiro.');
        }
    };

    const handleRemovePassageiro = async (passageiroId: string) => {
        if (!selectedViagem) return;
        try {
            await api.delete(`/viagens/${selectedViagem.id}/passageiros/${passageiroId}`);
            toast.success('Passageiro removido.');
            fetchViagens();
            const { data } = await api.get(`/viagens/${selectedViagem.id}`);
            setSelectedViagem(data);
        } catch { toast.error('Erro ao remover passageiro.'); }
    };

    const openPassageiroModal = async (viagem: Viagem) => {
        setSelectedViagem(viagem);
        await loadProcessos();
        setShowPassageiroModal(true);
    };

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

    return (
        <>
            <div className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="icon-circle accent">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <h2>Escala de Viagens</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Planejamento e controle de viagens TFD</p>
                    </div>
                </div>
                <button className="btn btn-accent" onClick={handleOpenNew}>
                    <Plus size={16} />
                    Nova Viagem
                </button>
            </div>

            <div className="page">
                <div className="filters-bar" style={{ display: 'flex', gap: 12 }}>
                    <select className="form-control" style={{ maxWidth: 200, fontSize: 13 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Todos os Status</option>
                        <option value="PLANEJADA">Planejada</option>
                        <option value="EM_CURSO">Em Curso</option>
                        <option value="CONCLUIDA">Concluída</option>
                        <option value="CANCELADA">Cancelada</option>
                    </select>
                </div>

                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : viagens.length === 0 ? (
                    <div className="empty-state card">
                        <Calendar size={40} style={{ opacity: 0.2 }} />
                        <p>Nenhuma viagem encontrada.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {viagens.map(v => {
                            const cfg = statusConfig[v.status] || statusConfig.PLANEJADA;
                            const StatusIcon = cfg.icon;
                            const isExpanded = expandedId === v.id;
                            return (
                                <div key={v.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    {/* Header */}
                                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none' }}
                                        onClick={() => setExpandedId(isExpanded ? null : v.id)}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: cfg.color }}>
                                                <StatusIcon size={18} />
                                                <span style={{ fontWeight: 600, fontSize: 13 }}>{cfg.label}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                                                <span style={{ fontWeight: 500 }}>{fmtDate(v.dataPartida)}</span>
                                                {v.dataRetorno && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→ {fmtDate(v.dataRetorno)}</span>}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {v.veiculo ? (
                                                    <>
                                                        <Car size={14} style={{ color: 'var(--text-muted)' }} />
                                                        <span style={{ fontSize: 13 }}>{v.veiculo.modelo} ({v.veiculo.placa})</span>
                                                    </>
                                                ) : v.linha ? (
                                                    <>
                                                        <Bus size={14} style={{ color: 'var(--text-muted)' }} />
                                                        <span style={{ fontSize: 13 }}>{v.linha.nome}</span>
                                                    </>
                                                ) : (
                                                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sem transporte definido</span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 13 }}>
                                                <UsersIcon size={14} />
                                                {v.passageiros.length} passageiro(s)
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                                                {v.motorista && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                                        <User size={14} />
                                                        <strong>Motorista:</strong> {v.motorista.nome}
                                                    </div>
                                                )}
                                                {v.linha?.empresa && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                                        <Bus size={14} />
                                                        <strong>Empresa:</strong> {v.linha.empresa}
                                                    </div>
                                                )}
                                                {v.observacoes && (
                                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                        {v.observacoes}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Passageiros */}
                                            <div style={{ marginBottom: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <h4 style={{ margin: 0, fontSize: 14 }}>Manifesto de Passageiros</h4>
                                                    {v.status === 'PLANEJADA' && (
                                                        <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => openPassageiroModal(v)}>
                                                            <UserPlus size={14} /> Adicionar
                                                        </button>
                                                    )}
                                                </div>
                                                {v.passageiros.length === 0 ? (
                                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhum passageiro alocado.</p>
                                                ) : (
                                                    <div className="table-container">
                                                        <table>
                                                            <thead>
                                                                <tr>
                                                                    <th>Paciente</th>
                                                                    <th>Processo</th>
                                                                    <th>Especialidade</th>
                                                                    <th>Destino</th>
                                                                    <th>Acomp.</th>
                                                                    {v.status === 'PLANEJADA' && <th></th>}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {v.passageiros.map(p => (
                                                                    <tr key={p.id}>
                                                                        <td style={{ fontWeight: 500 }}>{p.processo.paciente.nome}</td>
                                                                        <td><span className="badge">{p.processo.numero}</span></td>
                                                                        <td>{p.processo.especialidade}</td>
                                                                        <td>{p.processo.cidadeDestino}</td>
                                                                        <td>{p.acompanhante ? '✓ Sim' : 'Não'}</td>
                                                                        {v.status === 'PLANEJADA' && (
                                                                            <td>
                                                                                <button className="btn-icon" onClick={() => handleRemovePassageiro(p.id)} title="Remover">
                                                                                    <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                                                                                </button>
                                                                            </td>
                                                                        )}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status actions */}
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                {v.status === 'PLANEJADA' && (
                                                    <>
                                                        <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => updateStatus(v, 'CANCELADA')}>Cancelar</button>
                                                        <button className="btn btn-accent" style={{ fontSize: 12 }} onClick={() => updateStatus(v, 'EM_CURSO')}>Iniciar Viagem</button>
                                                    </>
                                                )}
                                                {v.status === 'EM_CURSO' && (
                                                    <button className="btn btn-accent" style={{ fontSize: 12 }} onClick={() => updateStatus(v, 'CONCLUIDA')}>
                                                        <CheckCircle2 size={14} /> Concluir Viagem
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Nova Viagem */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3>Nova Viagem</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {/* Tipo de Transporte */}
                                <div className="form-group">
                                    <label>Tipo de Transporte</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button type="button" className={`btn ${tipoViagem === 'FROTA' ? 'btn-accent' : 'btn-outline'}`}
                                            style={{ flex: 1, fontSize: 13 }} onClick={() => setTipoViagem('FROTA')}>
                                            <Car size={16} /> Frota Própria
                                        </button>
                                        <button type="button" className={`btn ${tipoViagem === 'LINHA' ? 'btn-accent' : 'btn-outline'}`}
                                            style={{ flex: 1, fontSize: 13 }} onClick={() => setTipoViagem('LINHA')}>
                                            <Bus size={16} /> Linha Intermunicipal
                                        </button>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Data de Partida</label>
                                        <input type="datetime-local" className="form-control" required
                                            value={form.dataPartida} onChange={e => setForm({ ...form, dataPartida: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Data de Retorno</label>
                                        <input type="datetime-local" className="form-control"
                                            value={form.dataRetorno} onChange={e => setForm({ ...form, dataRetorno: e.target.value })} />
                                    </div>
                                </div>

                                {tipoViagem === 'FROTA' ? (
                                    <>
                                        <div className="form-group">
                                            <label>Veículo</label>
                                            <select className="form-control" value={form.veiculoId} onChange={e => setForm({ ...form, veiculoId: e.target.value })}>
                                                <option value="">Selecione um veículo</option>
                                                {veiculos.map(v => (
                                                    <option key={v.id} value={v.id}>{v.modelo} — {v.placa} ({v.capacidade} lug.)</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Motorista</label>
                                            <select className="form-control" value={form.motoristaId} onChange={e => setForm({ ...form, motoristaId: e.target.value })}>
                                                <option value="">Selecione um motorista</option>
                                                {motoristas.map(m => (
                                                    <option key={m.id} value={m.id}>{m.nome} — {m.cpf}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <div className="form-group">
                                        <label>Linha Intermunicipal</label>
                                        <select className="form-control" value={form.linhaId} onChange={e => setForm({ ...form, linhaId: e.target.value })}>
                                            <option value="">Selecione uma linha</option>
                                            {linhas.map(l => (
                                                <option key={l.id} value={l.id}>{l.nome} {l.empresa ? `(${l.empresa})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>Observações</label>
                                    <textarea className="form-control" rows={2} value={form.observacoes}
                                        onChange={e => setForm({ ...form, observacoes: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent">Criar Viagem</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Adicionar Passageiro */}
            {showPassageiroModal && selectedViagem && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h3>Alocar Passageiro — Viagem {fmtDate(selectedViagem.dataPartida)}</h3>
                            <button className="btn-icon" onClick={() => setShowPassageiroModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                                Selecione um processo aprovado/agendado para alocar o paciente nesta viagem.
                            </p>
                            {processosDisponiveis.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>Nenhum processo disponível.</p>
                            ) : (
                                <div className="table-container" style={{ maxHeight: 350, overflow: 'auto' }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Processo</th>
                                                <th>Paciente</th>
                                                <th>Especialidade</th>
                                                <th>Destino</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {processosDisponiveis.map(p => {
                                                const jaAlocado = selectedViagem.passageiros.some(pv => pv.processo.id === p.id);
                                                return (
                                                    <tr key={p.id} style={{ opacity: jaAlocado ? 0.5 : 1 }}>
                                                        <td><span className="badge">{p.numero}</span></td>
                                                        <td style={{ fontWeight: 500 }}>{p.paciente.nome}</td>
                                                        <td>{p.especialidade}</td>
                                                        <td>{p.cidadeDestino}</td>
                                                        <td>
                                                            {jaAlocado ? (
                                                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Alocado</span>
                                                            ) : (
                                                                <div style={{ display: 'flex', gap: 4 }}>
                                                                    <button className="btn btn-accent" style={{ fontSize: 11, padding: '2px 8px' }}
                                                                        onClick={() => handleAddPassageiro(p, false)}>
                                                                        <UserPlus size={12} /> Paciente
                                                                    </button>
                                                                    <button className="btn btn-outline" style={{ fontSize: 11, padding: '2px 8px' }}
                                                                        onClick={() => handleAddPassageiro(p, true)}>
                                                                        + Acomp.
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowPassageiroModal(false)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

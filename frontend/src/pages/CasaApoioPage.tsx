import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { Plus, X, Home, Bed, Edit2, ToggleLeft, ToggleRight, LogOut, XCircle, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface CasaApoio {
    id: string; nome: string; endereco?: string; cidade: string;
    telefone?: string; totalLeitos: number; ativo: boolean;
    _count?: { vales: number };
}

interface Paciente { id: string; nome: string; cpf: string; }
interface Processo { id: string; numero: string; paciente: Paciente; }

interface ValeHospedagem {
    id: string; dataEntrada: string; dataSaida?: string;
    acompanhante: boolean; status: string; observacoes?: string;
    processo: Processo; casaApoio: CasaApoio;
    criadoPor: { nome: string }; createdAt: string;
}

const statusVale: Record<string, { label: string; color: string }> = {
    ATIVO: { label: 'Hospedado', color: 'var(--success)' },
    ENCERRADO: { label: 'Check-out', color: 'var(--info)' },
    CANCELADO: { label: 'Cancelado', color: 'var(--danger)' },
};

export default function CasaApoioPage() {
    const [tab, setTab] = useState<'casas' | 'vales'>('casas');
    const [casas, setCasas] = useState<CasaApoio[]>([]);
    const [vales, setVales] = useState<ValeHospedagem[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showCasaModal, setShowCasaModal] = useState(false);
    const [editingCasa, setEditingCasa] = useState<CasaApoio | null>(null);
    const [showValeModal, setShowValeModal] = useState(false);
    const [processos, setProcessos] = useState<Processo[]>([]);

    const [casaForm, setCasaForm] = useState({ nome: '', endereco: '', cidade: '', telefone: '', totalLeitos: 10 });
    const [valeForm, setValeForm] = useState({ processoId: '', casaApoioId: '', dataEntrada: '', acompanhante: false, observacoes: '' });

    const fetchCasas = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/casas-apoio');
            setCasas(data);
        } catch { toast.error('Erro ao carregar casas de apoio.'); }
        finally { setLoading(false); }
    }, []);

    const fetchVales = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/casas-apoio/vales');
            setVales(data);
        } catch { toast.error('Erro ao carregar vales.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (tab === 'casas') fetchCasas();
        else fetchVales();
    }, [tab, fetchCasas, fetchVales]);

    const openCasaModal = (casa?: CasaApoio) => {
        if (casa) {
            setEditingCasa(casa);
            setCasaForm({ nome: casa.nome, endereco: casa.endereco || '', cidade: casa.cidade, telefone: casa.telefone || '', totalLeitos: casa.totalLeitos });
        } else {
            setEditingCasa(null);
            setCasaForm({ nome: '', endereco: '', cidade: '', telefone: '', totalLeitos: 10 });
        }
        setShowCasaModal(true);
    };

    const handleSubmitCasa = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCasa) {
                await api.put(`/casas-apoio/${editingCasa.id}`, casaForm);
                toast.success('Casa de apoio atualizada!');
            } else {
                await api.post('/casas-apoio', casaForm);
                toast.success('Casa de apoio cadastrada!');
            }
            setShowCasaModal(false);
            fetchCasas();
        } catch (err: any) { toast.error(err.response?.data?.error || 'Erro ao salvar.'); }
    };

    const toggleCasa = async (casa: CasaApoio) => {
        try {
            if (casa.ativo) {
                await api.delete(`/casas-apoio/${casa.id}`);
                toast.success('Casa de apoio desativada.');
            } else {
                await api.put(`/casas-apoio/${casa.id}`, { ativo: true });
                toast.success('Casa de apoio reativada.');
            }
            fetchCasas();
        } catch { toast.error('Erro ao alterar status.'); }
    };

    const openValeModal = async () => {
        try {
            const { data } = await api.get('/viagens/processos/disponiveis');
            setProcessos(data);
        } catch { /* silent */ }
        setValeForm({ processoId: '', casaApoioId: '', dataEntrada: '', acompanhante: false, observacoes: '' });
        setShowValeModal(true);
    };

    const handleSubmitVale = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/casas-apoio/vales', valeForm);
            toast.success('Vale-hospedagem emitido!');
            setShowValeModal(false);
            fetchVales();
        } catch (err: any) { toast.error(err.response?.data?.error || 'Erro ao emitir vale.'); }
    };

    const encerrarVale = async (id: string) => {
        try {
            await api.patch(`/casas-apoio/vales/${id}/encerrar`);
            toast.success('Check-out realizado!');
            fetchVales();
        } catch { toast.error('Erro ao encerrar hospedagem.'); }
    };

    const cancelarVale = async (id: string) => {
        try {
            await api.patch(`/casas-apoio/vales/${id}/cancelar`);
            toast.success('Vale cancelado.');
            fetchVales();
        } catch { toast.error('Erro ao cancelar vale.'); }
    };

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');
    const casasAtivas = casas.filter(c => c.ativo);

    return (
        <>
            <div className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="icon-circle accent"><Home size={18} /></div>
                    <div>
                        <h2>Casa de Apoio</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hospedagem e vales para pacientes TFD</p>
                    </div>
                </div>
                <button className="btn btn-accent" onClick={() => tab === 'casas' ? openCasaModal() : openValeModal()}>
                    <Plus size={16} />
                    {tab === 'casas' ? 'Nova Casa de Apoio' : 'Emitir Vale'}
                </button>
            </div>

            <div className="page">
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid var(--border-color)' }}>
                    <button className={`btn ${tab === 'casas' ? 'btn-accent' : 'btn-outline'}`}
                        style={{ borderRadius: '8px 8px 0 0', fontSize: 13 }} onClick={() => setTab('casas')}>
                        <Home size={15} /> Casas de Apoio
                    </button>
                    <button className={`btn ${tab === 'vales' ? 'btn-accent' : 'btn-outline'}`}
                        style={{ borderRadius: '8px 8px 0 0', fontSize: 13 }} onClick={() => setTab('vales')}>
                        <Bed size={15} /> Vales de Hospedagem
                    </button>
                </div>

                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : tab === 'casas' ? (
                    casas.length === 0 ? (
                        <div className="empty-state card"><Home size={40} style={{ opacity: 0.2 }} /><p>Nenhuma casa de apoio cadastrada.</p></div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                            {casas.map(c => {
                                const ocupados = c._count?.vales || 0;
                                const disponiveis = c.totalLeitos - ocupados;
                                const ocupacaoPct = c.totalLeitos > 0 ? (ocupados / c.totalLeitos) * 100 : 0;
                                return (
                                    <div key={c.id} className="card" style={{ padding: 16, opacity: c.ativo ? 1 : 0.6 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: 15 }}>{c.nome}</h4>
                                                {c.cidade && (
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                                        <MapPin size={12} /> {c.cidade}
                                                    </div>
                                                )}
                                                {c.telefone && (
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                        <Phone size={12} /> {c.telefone}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn-icon" onClick={() => openCasaModal(c)} title="Editar"><Edit2 size={14} /></button>
                                                <button className="btn-icon" onClick={() => toggleCasa(c)} title={c.ativo ? 'Desativar' : 'Ativar'}>
                                                    {c.ativo ? <ToggleRight size={18} className="text-success" /> : <ToggleLeft size={18} className="text-muted" />}
                                                </button>
                                            </div>
                                        </div>
                                        {/* Ocupação bar */}
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                                <span>{ocupados} / {c.totalLeitos} leitos</span>
                                                <span style={{ color: disponiveis > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                                    {disponiveis > 0 ? `${disponiveis} disponíveis` : 'Lotado'}
                                                </span>
                                            </div>
                                            <div style={{ height: 6, backgroundColor: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${Math.min(ocupacaoPct, 100)}%`,
                                                    backgroundColor: ocupacaoPct >= 90 ? 'var(--danger)' : ocupacaoPct >= 60 ? 'var(--warning)' : 'var(--success)',
                                                    borderRadius: 3,
                                                    transition: 'width 0.3s ease'
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
                    vales.length === 0 ? (
                        <div className="empty-state card"><Bed size={40} style={{ opacity: 0.2 }} /><p>Nenhum vale emitido.</p></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Paciente</th>
                                        <th>Processo</th>
                                        <th>Casa de Apoio</th>
                                        <th>Entrada</th>
                                        <th>Saída</th>
                                        <th>Acomp.</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vales.map(v => {
                                        const st = statusVale[v.status] || statusVale.ATIVO;
                                        return (
                                            <tr key={v.id}>
                                                <td style={{ fontWeight: 500 }}>{v.processo.paciente.nome}</td>
                                                <td><span className="badge">{v.processo.numero}</span></td>
                                                <td>{v.casaApoio.nome}</td>
                                                <td>{fmtDate(v.dataEntrada)}</td>
                                                <td>{v.dataSaida ? fmtDate(v.dataSaida) : '—'}</td>
                                                <td>{v.acompanhante ? '✓' : '—'}</td>
                                                <td><span className="status-badge" style={{ backgroundColor: st.color + '22', color: st.color }}>{st.label}</span></td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {v.status === 'ATIVO' && (
                                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                            <button className="btn btn-outline" style={{ fontSize: 11, padding: '2px 8px' }}
                                                                onClick={() => encerrarVale(v.id)}>
                                                                <LogOut size={12} /> Check-out
                                                            </button>
                                                            <button className="btn btn-outline" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--danger)' }}
                                                                onClick={() => cancelarVale(v.id)}>
                                                                <XCircle size={12} /> Cancelar
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
                    )
                )}
            </div>

            {/* Modal Casa de Apoio */}
            {showCasaModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 450 }}>
                        <div className="modal-header">
                            <h3>{editingCasa ? 'Editar Casa de Apoio' : 'Nova Casa de Apoio'}</h3>
                            <button className="btn-icon" onClick={() => setShowCasaModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitCasa}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Nome</label>
                                    <input className="form-control" required value={casaForm.nome}
                                        onChange={e => setCasaForm({ ...casaForm, nome: e.target.value })} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Cidade</label>
                                        <input className="form-control" required value={casaForm.cidade}
                                            onChange={e => setCasaForm({ ...casaForm, cidade: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Total de Leitos</label>
                                        <input type="number" className="form-control" required min="1"
                                            value={casaForm.totalLeitos}
                                            onChange={e => setCasaForm({ ...casaForm, totalLeitos: parseInt(e.target.value) })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Endereço</label>
                                    <input className="form-control" value={casaForm.endereco}
                                        onChange={e => setCasaForm({ ...casaForm, endereco: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Telefone</label>
                                    <input className="form-control" value={casaForm.telefone}
                                        onChange={e => setCasaForm({ ...casaForm, telefone: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowCasaModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Emitir Vale */}
            {showValeModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>Emitir Vale-Hospedagem</h3>
                            <button className="btn-icon" onClick={() => setShowValeModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitVale}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Processo / Paciente</label>
                                    <select className="form-control" required value={valeForm.processoId}
                                        onChange={e => setValeForm({ ...valeForm, processoId: e.target.value })}>
                                        <option value="">Selecione</option>
                                        {processos.map(p => (
                                            <option key={p.id} value={p.id}>{p.numero} — {p.paciente.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Casa de Apoio</label>
                                    <select className="form-control" required value={valeForm.casaApoioId}
                                        onChange={e => setValeForm({ ...valeForm, casaApoioId: e.target.value })}>
                                        <option value="">Selecione</option>
                                        {casasAtivas.map(c => (
                                            <option key={c.id} value={c.id}>{c.nome} — {c.cidade}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Data de Entrada</label>
                                    <input type="date" className="form-control" required value={valeForm.dataEntrada}
                                        onChange={e => setValeForm({ ...valeForm, dataEntrada: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="checkbox" id="acomp" checked={valeForm.acompanhante}
                                        onChange={e => setValeForm({ ...valeForm, acompanhante: e.target.checked })} />
                                    <label htmlFor="acomp" style={{ margin: 0 }}>Com acompanhante</label>
                                </div>
                                <div className="form-group">
                                    <label>Observações</label>
                                    <textarea className="form-control" rows={2} value={valeForm.observacoes}
                                        onChange={e => setValeForm({ ...valeForm, observacoes: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowValeModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent">Emitir Vale</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

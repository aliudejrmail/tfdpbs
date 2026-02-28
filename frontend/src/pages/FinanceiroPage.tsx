import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { DollarSign, Plus, X, CheckCircle2, Banknote, Car } from 'lucide-react';
import toast from 'react-hot-toast';

interface Paciente { id: string; nome: string; cpf: string; }
interface Processo { id: string; numero: string; paciente: Paciente; especialidade: string; }
interface Motorista { id: string; nome: string; cpf: string; }
interface Viagem { id: string; dataPartida: string; linha?: { nome: string }; }

interface AjudaCusto {
    id: string; processoId: string; tipo: string; descricao?: string;
    valor: string; dataReferencia: string; status: string;
    processo: Processo; criadoPor: { nome: string };
    createdAt: string;
}

interface Diaria {
    id: string; motoristaId: string; tipo: string;
    valor: string; dataReferencia: string; status: string;
    motorista: Motorista; viagem: Viagem;
    criadoPor: { nome: string }; createdAt: string;
}

const tiposAjuda = [
    { value: 'ALIMENTACAO', label: 'Alimentação' },
    { value: 'TRANSPORTE_URBANO', label: 'Transporte Urbano' },
    { value: 'HOSPEDAGEM', label: 'Hospedagem' },
    { value: 'OUTROS', label: 'Outros' },
];

const statusLabels: Record<string, { label: string; color: string }> = {
    PENDENTE: { label: 'Pendente', color: 'var(--warning)' },
    APROVADO: { label: 'Aprovado', color: 'var(--info)' },
    PAGO: { label: 'Pago', color: 'var(--success)' },
    CANCELADO: { label: 'Cancelado', color: 'var(--danger)' },
};

export default function FinanceiroPage() {
    const [tab, setTab] = useState<'ajudas' | 'diarias'>('ajudas');
    const [ajudas, setAjudas] = useState<AjudaCusto[]>([]);
    const [diarias, setDiarias] = useState<Diaria[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showAjudaModal, setShowAjudaModal] = useState(false);
    const [showDiariaModal, setShowDiariaModal] = useState(false);
    const [processos, setProcessos] = useState<Processo[]>([]);
    const [motoristas, setMotoristas] = useState<Motorista[]>([]);
    const [viagens, setViagens] = useState<Viagem[]>([]);

    const [ajudaForm, setAjudaForm] = useState({ processoId: '', tipo: 'ALIMENTACAO', descricao: '', valor: '', dataReferencia: '' });
    const [diariaForm, setDiariaForm] = useState({ motoristaId: '', viagemId: '', tipo: 'COMPLETA', valor: '150', dataReferencia: '' });

    const fetchAjudas = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/financeiro/ajudas-custo');
            setAjudas(data);
        } catch { toast.error('Erro ao carregar ajudas de custo.'); }
        finally { setLoading(false); }
    }, []);

    const fetchDiarias = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/financeiro/diarias');
            setDiarias(data);
        } catch { toast.error('Erro ao carregar diárias.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (tab === 'ajudas') fetchAjudas();
        else fetchDiarias();
    }, [tab, fetchAjudas, fetchDiarias]);

    const loadProcessos = async () => {
        try {
            const { data } = await api.get('/viagens/processos/disponiveis');
            setProcessos(data);
        } catch { /* silent */ }
    };

    const loadMotoristas = async () => {
        try {
            const [m, v] = await Promise.all([
                api.get('/motoristas', { params: { ativo: 'true' } }),
                api.get('/viagens', { params: { status: 'CONCLUIDA' } }),
            ]);
            setMotoristas(m.data);
            setViagens(v.data);
        } catch { /* silent */ }
    };

    const handleCreateAjuda = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/financeiro/ajudas-custo', { ...ajudaForm, valor: parseFloat(ajudaForm.valor) });
            toast.success('Ajuda de custo lançada!');
            setShowAjudaModal(false);
            fetchAjudas();
        } catch (err: any) { toast.error(err.response?.data?.error || 'Erro ao lançar ajuda.'); }
    };

    const handleCreateDiaria = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/financeiro/diarias', { ...diariaForm, valor: parseFloat(diariaForm.valor) });
            toast.success('Diária lançada!');
            setShowDiariaModal(false);
            fetchDiarias();
        } catch (err: any) { toast.error(err.response?.data?.error || 'Erro ao lançar diária.'); }
    };

    const updateAjudaStatus = async (id: string, status: string) => {
        try {
            await api.patch(`/financeiro/ajudas-custo/${id}/status`, { status });
            toast.success(`Status atualizado para ${statusLabels[status]?.label || status}.`);
            fetchAjudas();
        } catch { toast.error('Erro ao atualizar status.'); }
    };

    const updateDiariaStatus = async (id: string, status: string) => {
        try {
            await api.patch(`/financeiro/diarias/${id}/status`, { status });
            toast.success(`Status atualizado para ${statusLabels[status]?.label || status}.`);
            fetchDiarias();
        } catch { toast.error('Erro ao atualizar status.'); }
    };

    const fmtMoney = (v: string | number) => `R$ ${parseFloat(String(v)).toFixed(2).replace('.', ',')}`;
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

    const totalAjudas = ajudas.reduce((s, a) => s + parseFloat(a.valor), 0);
    const totalDiarias = diarias.reduce((s, d) => s + parseFloat(d.valor), 0);

    return (
        <>
            <div className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="icon-circle accent">
                        <DollarSign size={18} />
                    </div>
                    <div>
                        <h2>Financeiro</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ajudas de Custo e Diárias de Motoristas</p>
                    </div>
                </div>
                <button className="btn btn-accent" onClick={async () => {
                    if (tab === 'ajudas') {
                        await loadProcessos();
                        setAjudaForm({ processoId: '', tipo: 'ALIMENTACAO', descricao: '', valor: '', dataReferencia: '' });
                        setShowAjudaModal(true);
                    } else {
                        await loadMotoristas();
                        setDiariaForm({ motoristaId: '', viagemId: '', tipo: 'COMPLETA', valor: '150', dataReferencia: '' });
                        setShowDiariaModal(true);
                    }
                }}>
                    <Plus size={16} />
                    {tab === 'ajudas' ? 'Nova Ajuda de Custo' : 'Nova Diária'}
                </button>
            </div>

            <div className="page">
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid var(--border-color)', paddingBottom: 0 }}>
                    <button
                        className={`btn ${tab === 'ajudas' ? 'btn-accent' : 'btn-outline'}`}
                        style={{ borderRadius: '8px 8px 0 0', fontSize: 13 }}
                        onClick={() => setTab('ajudas')}>
                        <Banknote size={15} /> Ajudas de Custo
                    </button>
                    <button
                        className={`btn ${tab === 'diarias' ? 'btn-accent' : 'btn-outline'}`}
                        style={{ borderRadius: '8px 8px 0 0', fontSize: 13 }}
                        onClick={() => setTab('diarias')}>
                        <Car size={15} /> Diárias de Motoristas
                    </button>
                </div>

                {/* Summary cards */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div className="card" style={{ padding: '12px 16px', flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {tab === 'ajudas' ? 'Total de Ajudas' : 'Total de Diárias'}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
                            {fmtMoney(tab === 'ajudas' ? totalAjudas : totalDiarias)}
                        </div>
                    </div>
                    <div className="card" style={{ padding: '12px 16px', flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lançamentos</div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>
                            {tab === 'ajudas' ? ajudas.length : diarias.length}
                        </div>
                    </div>
                    <div className="card" style={{ padding: '12px 16px', flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pendentes</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)' }}>
                            {tab === 'ajudas'
                                ? ajudas.filter(a => a.status === 'PENDENTE').length
                                : diarias.filter(d => d.status === 'PENDENTE').length
                            }
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : tab === 'ajudas' ? (
                    /* Ajudas table */
                    ajudas.length === 0 ? (
                        <div className="empty-state card"><DollarSign size={40} style={{ opacity: 0.2 }} /><p>Nenhuma ajuda de custo registrada.</p></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Processo</th>
                                        <th>Paciente</th>
                                        <th>Tipo</th>
                                        <th>Valor</th>
                                        <th>Data Ref.</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ajudas.map(a => {
                                        const st = statusLabels[a.status] || statusLabels.PENDENTE;
                                        return (
                                            <tr key={a.id}>
                                                <td><span className="badge">{a.processo.numero}</span></td>
                                                <td style={{ fontWeight: 500 }}>{a.processo.paciente.nome}</td>
                                                <td>{tiposAjuda.find(t => t.value === a.tipo)?.label || a.tipo}</td>
                                                <td style={{ fontWeight: 600 }}>{fmtMoney(a.valor)}</td>
                                                <td>{fmtDate(a.dataReferencia)}</td>
                                                <td><span className="status-badge" style={{ backgroundColor: st.color + '22', color: st.color }}>{st.label}</span></td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {a.status === 'PENDENTE' && (
                                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                            <button className="btn btn-outline" style={{ fontSize: 11, padding: '2px 8px' }}
                                                                onClick={() => updateAjudaStatus(a.id, 'APROVADO')}>Aprovar</button>
                                                            <button className="btn btn-outline" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--danger)' }}
                                                                onClick={() => updateAjudaStatus(a.id, 'CANCELADO')}>Cancelar</button>
                                                        </div>
                                                    )}
                                                    {a.status === 'APROVADO' && (
                                                        <button className="btn btn-accent" style={{ fontSize: 11, padding: '2px 8px' }}
                                                            onClick={() => updateAjudaStatus(a.id, 'PAGO')}>
                                                            <CheckCircle2 size={12} /> Marcar Pago
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    /* Diarias table */
                    diarias.length === 0 ? (
                        <div className="empty-state card"><Car size={40} style={{ opacity: 0.2 }} /><p>Nenhuma diária registrada.</p></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Motorista</th>
                                        <th>Viagem</th>
                                        <th>Tipo</th>
                                        <th>Valor</th>
                                        <th>Data Ref.</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {diarias.map(d => {
                                        const st = statusLabels[d.status] || statusLabels.PENDENTE;
                                        return (
                                            <tr key={d.id}>
                                                <td style={{ fontWeight: 500 }}>{d.motorista.nome}</td>
                                                <td>{fmtDate(d.viagem.dataPartida)} {d.viagem.linha ? `(${d.viagem.linha.nome})` : ''}</td>
                                                <td>{d.tipo === 'COMPLETA' ? 'Completa' : 'Meia'}</td>
                                                <td style={{ fontWeight: 600 }}>{fmtMoney(d.valor)}</td>
                                                <td>{fmtDate(d.dataReferencia)}</td>
                                                <td><span className="status-badge" style={{ backgroundColor: st.color + '22', color: st.color }}>{st.label}</span></td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {d.status === 'PENDENTE' && (
                                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                            <button className="btn btn-outline" style={{ fontSize: 11, padding: '2px 8px' }}
                                                                onClick={() => updateDiariaStatus(d.id, 'APROVADO')}>Aprovar</button>
                                                        </div>
                                                    )}
                                                    {d.status === 'APROVADO' && (
                                                        <button className="btn btn-accent" style={{ fontSize: 11, padding: '2px 8px' }}
                                                            onClick={() => updateDiariaStatus(d.id, 'PAGO')}>
                                                            <CheckCircle2 size={12} /> Marcar Pago
                                                        </button>
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

            {/* Modal Ajuda de Custo */}
            {showAjudaModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>Nova Ajuda de Custo</h3>
                            <button className="btn-icon" onClick={() => setShowAjudaModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateAjuda}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Processo</label>
                                    <select className="form-control" required value={ajudaForm.processoId}
                                        onChange={e => setAjudaForm({ ...ajudaForm, processoId: e.target.value })}>
                                        <option value="">Selecione um processo</option>
                                        {processos.map(p => (
                                            <option key={p.id} value={p.id}>{p.numero} — {p.paciente.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Tipo</label>
                                        <select className="form-control" value={ajudaForm.tipo}
                                            onChange={e => setAjudaForm({ ...ajudaForm, tipo: e.target.value })}>
                                            {tiposAjuda.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Valor (R$)</label>
                                        <input type="number" className="form-control" required step="0.01" min="0.01"
                                            value={ajudaForm.valor} onChange={e => setAjudaForm({ ...ajudaForm, valor: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Data de Referência</label>
                                    <input type="date" className="form-control" required
                                        value={ajudaForm.dataReferencia} onChange={e => setAjudaForm({ ...ajudaForm, dataReferencia: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Descrição (opcional)</label>
                                    <input className="form-control" value={ajudaForm.descricao}
                                        onChange={e => setAjudaForm({ ...ajudaForm, descricao: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowAjudaModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent">Lançar Ajuda</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Diária */}
            {showDiariaModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>Nova Diária</h3>
                            <button className="btn-icon" onClick={() => setShowDiariaModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateDiaria}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Motorista</label>
                                    <select className="form-control" required value={diariaForm.motoristaId}
                                        onChange={e => setDiariaForm({ ...diariaForm, motoristaId: e.target.value })}>
                                        <option value="">Selecione um motorista</option>
                                        {motoristas.map(m => (
                                            <option key={m.id} value={m.id}>{m.nome} — CPF: {m.cpf}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Viagem</label>
                                    <select className="form-control" required value={diariaForm.viagemId}
                                        onChange={e => setDiariaForm({ ...diariaForm, viagemId: e.target.value })}>
                                        <option value="">Selecione uma viagem</option>
                                        {viagens.map(v => (
                                            <option key={v.id} value={v.id}>
                                                {new Date(v.dataPartida).toLocaleDateString('pt-BR')}
                                                {v.linha ? ` — ${v.linha.nome}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Tipo</label>
                                        <select className="form-control" value={diariaForm.tipo}
                                            onChange={e => setDiariaForm({ ...diariaForm, tipo: e.target.value })}>
                                            <option value="COMPLETA">Completa</option>
                                            <option value="MEIA">Meia Diária</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Valor (R$)</label>
                                        <input type="number" className="form-control" required step="0.01" min="0.01"
                                            value={diariaForm.valor} onChange={e => setDiariaForm({ ...diariaForm, valor: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Data de Referência</label>
                                    <input type="date" className="form-control" required
                                        value={diariaForm.dataReferencia} onChange={e => setDiariaForm({ ...diariaForm, dataReferencia: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowDiariaModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent">Lançar Diária</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

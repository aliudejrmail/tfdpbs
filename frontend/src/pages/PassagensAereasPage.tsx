import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { Plane, Search, Plus, Ticket, CheckCircle, XCircle, Clock } from 'lucide-react';
import NovaPassagemModal from '../components/NovaPassagemModal';
import EmitirBilheteModal from '../components/EmitirBilheteModal';

const STATUS_OPTIONSArr = [
    { value: 'PENDENTE', label: 'Pendente', icon: <Clock size={14} />, color: '#f59e0b' },
    { value: 'AUTORIZADO', label: 'Autorizado', icon: <CheckCircle size={14} />, color: '#10b981' },
    { value: 'EMITIDO', label: 'Emitido', icon: <Ticket size={14} />, color: '#3b82f6' },
    { value: 'CANCELADO', label: 'Cancelado', icon: <XCircle size={14} />, color: '#ef4444' },
    { value: 'CONCLUIDO', label: 'Concluído', icon: <CheckCircle size={14} />, color: '#6366f1' },
];

export default function PassagensAereasPage() {
    const [demandas, setDemandas] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [showNovaModal, setShowNovaModal] = useState(false);
    const [selectedDemanda, setSelectedDemanda] = useState<any>(null);
    const { user } = useAuth();
    const limit = 15;

    const canCreate = ['UBS', 'ATENDENTE', 'SEC_ADM', 'REGULACAO'].includes(user?.perfil || '');
    const canEmit = ['REGULACAO', 'SEC_ADM'].includes(user?.perfil || '');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, limit };
            if (status) params.status = status;
            const { data } = await api.get('/passagens-aereas', { params });
            setDemandas(data.demandas);
        } catch (err) {
            console.error('Erro ao buscar demandas:', err);
        } finally {
            setLoading(false);
        }
    }, [page, status]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getStatusInfo = (s: string) => STATUS_OPTIONSArr.find(o => o.value === s) || STATUS_OPTIONSArr[0];

    return (
        <>
            <div className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Plane size={24} color="var(--accent)" />
                    <h2>Demandas de Passagens Aéreas</h2>
                </div>
                {canCreate && (
                    <button className="btn btn-accent" onClick={() => setShowNovaModal(true)}>
                        <Plus size={16} />
                        Solicitar Passagem
                    </button>
                )}
            </div>

            <div className="page">
                <div className="filters-bar">
                    <div className="search-box">
                        <Search size={15} />
                        <input
                            className="form-control"
                            placeholder="Filtrar demandas..."
                            disabled={loading}
                        />
                    </div>
                    <select
                        className="form-control"
                        style={{ width: 200 }}
                        value={status}
                        onChange={e => { setStatus(e.target.value); setPage(1); }}
                    >
                        <option value="">Todos os Status</option>
                        {STATUS_OPTIONSArr.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : demandas.length === 0 ? (
                    <div className="empty-state">
                        <Plane size={40} style={{ opacity: 0.2 }} />
                        <p>Nenhuma demanda encontrada</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Paciente</th>
                                    <th>Destino</th>
                                    <th>Data Ida / Volta</th>
                                    <th>Status</th>
                                    <th>Localizador (PNR)</th>
                                    <th>Solicitado por</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {demandas.map(d => {
                                    const s = getStatusInfo(d.status);
                                    return (
                                        <tr key={d.id}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{d.processo?.paciente?.nome}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Proc: {d.processo?.numero}</div>
                                            </td>
                                            <td>{d.destino}</td>
                                            <td>
                                                <div style={{ fontSize: 12 }}>
                                                    🛫 {format(new Date(d.dataIda), 'dd/MM/yy', { locale: ptBR })}
                                                </div>
                                                {d.dataVolta && (
                                                    <div style={{ fontSize: 12 }}>
                                                        🛬 {format(new Date(d.dataVolta), 'dd/MM/yy', { locale: ptBR })}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <span className="badge" style={{
                                                    backgroundColor: `${s.color}20`,
                                                    color: s.color,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    width: 'fit-content'
                                                }}>
                                                    {s.icon} {s.label}
                                                </span>
                                            </td>
                                            <td>
                                                {d.pnr ? (
                                                    <strong style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{d.pnr}</strong>
                                                ) : (
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pendente</span>
                                                )}
                                                {d.companhiaAerea && <div style={{ fontSize: 10 }}>{d.companhiaAerea}</div>}
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {d.solicitadoPor?.nome}
                                            </td>
                                            <td>
                                                {canEmit && d.status !== 'CONCLUIDO' && d.status !== 'CANCELADO' && (
                                                    <button
                                                        className="btn btn-outline btn-sm"
                                                        style={{ padding: '4px 8px' }}
                                                        onClick={() => setSelectedDemanda(d)}
                                                    >
                                                        {d.status === 'EMITIDO' ? 'Atualizar PNR' : 'Autorizar/Emitir'}
                                                    </button>
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

            {showNovaModal && (
                <NovaPassagemModal
                    onClose={() => setShowNovaModal(false)}
                    onCreated={() => { setShowNovaModal(false); fetchData(); }}
                />
            )}

            {selectedDemanda && (
                <EmitirBilheteModal
                    demanda={selectedDemanda}
                    onClose={() => setSelectedDemanda(null)}
                    onUpdated={() => { setSelectedDemanda(null); fetchData(); }}
                />
            )}
        </>
    );
}

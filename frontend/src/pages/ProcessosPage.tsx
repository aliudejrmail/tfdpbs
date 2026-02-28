import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import type { ProcessoTFD } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StatusBadge from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, FileText, RefreshCw } from 'lucide-react';
import NovoProcessoModal from '../components/NovoProcessoModal';

const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Todos os status' },
    { value: 'PENDENTE', label: 'Pendente' },
    { value: 'EM_ANALISE', label: 'Em Análise' },
    { value: 'APROVADO', label: 'Aprovado' },
    { value: 'NEGADO', label: 'Negado' },
    { value: 'AGENDADO', label: 'Agendado' },
    { value: 'CONCLUIDO', label: 'Concluído' },
    { value: 'CANCELADO', label: 'Cancelado' },
];

export default function ProcessosPage() {
    const [processos, setProcessos] = useState<ProcessoTFD[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [prioridade, setPrioridade] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();
    const limit = 15;

    const canCreate = ['UBS', 'ATENDENTE', 'SEC_ADM'].includes(user?.perfil || '');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (search) params.search = search;
            if (status) params.status = status;
            if (prioridade) params.prioridade = prioridade;
            const { data } = await api.get('/processos', { params });
            setProcessos(data.processos);
            setTotal(data.total);
        } finally {
            setLoading(false);
        }
    }, [page, search, status, prioridade]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalPages = Math.ceil(total / limit);

    const prioridadeLabel = (p: number) => {
        if (p === 3) return <span className="badge prioridade-3">Emergência</span>;
        if (p === 2) return <span className="badge prioridade-2">Urgente</span>;
        return <span className="badge prioridade-1">Normal</span>;
    };

    return (
        <>
            <div className="topbar">
                <h2>Processos TFD</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={fetchData}>
                        <RefreshCw size={14} />
                    </button>
                    {canCreate && (
                        <button className="btn btn-accent" onClick={() => setShowModal(true)}>
                            <Plus size={16} />
                            Novo Processo
                        </button>
                    )}
                </div>
            </div>

            <div className="page">
                <div className="filters-bar">
                    <div className="search-box">
                        <Search size={15} />
                        <input
                            className="form-control"
                            placeholder="Buscar por número, paciente, especialidade..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <select className="form-control" style={{ width: 180 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select className="form-control" style={{ width: 150 }} value={prioridade} onChange={e => { setPrioridade(e.target.value); setPage(1); }}>
                        <option value="">Prioridade</option>
                        <option value="1">Normal</option>
                        <option value="2">Urgente</option>
                        <option value="3">Emergência</option>
                    </select>
                </div>

                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : processos.length === 0 ? (
                    <div className="empty-state">
                        <FileText size={40} style={{ opacity: 0.3 }} />
                        <p>Nenhum processo encontrado</p>
                        <small>Tente ajustar os filtros ou criar um novo processo</small>
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Número</th>
                                        <th>Paciente</th>
                                        <th>Especialidade / CID</th>
                                        <th>Destino</th>
                                        <th>Status</th>
                                        <th>Prioridade</th>
                                        <th>Unidade</th>
                                        <th>Data Abertura</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processos.map(p => (
                                        <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/processos/${p.id}`)}>
                                            <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)' }}>{p.numero}</td>
                                            <td style={{ fontWeight: 500 }}>{p.paciente?.nome}</td>
                                            <td>
                                                <div>{p.especialidade}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.cid}</div>
                                            </td>
                                            <td style={{ fontSize: 12 }}>{p.cidadeDestino}-{p.ufDestino}</td>
                                            <td><StatusBadge status={p.status} /></td>
                                            <td>{prioridadeLabel(p.prioridade)}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.unidadeOrigem?.nome}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="pagination">
                            <span className="page-info">
                                {total} processo{total !== 1 ? 's' : ''} — Página {page} de {totalPages}
                            </span>
                            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</button>
                        </div>
                    </>
                )}
            </div>

            {showModal && (
                <NovoProcessoModal
                    onClose={() => setShowModal(false)}
                    onCreated={() => { setShowModal(false); fetchData(); }}
                />
            )}
        </>
    );
}

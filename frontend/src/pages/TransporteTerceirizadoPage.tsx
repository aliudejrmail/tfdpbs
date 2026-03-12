import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { Truck, Search, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Processo {
    id: string;
    numero: string;
    paciente: { id: string; nome: string; cpf: string };
    tipoTransporte: string;
    transporteTerceirizado: boolean;
    empresaTransporte?: { id: string; nome: string; cnpj: string; tipo: string } | null;
    cidadeDestino: string;
    ufDestino: string;
    status: string;
    createdAt: string;
}

const statusColors: Record<string, string> = {
    PENDENTE: 'rgba(245, 158, 11, 0.1)',
    EM_ANALISE: 'rgba(59, 130, 246, 0.1)',
    APROVADO: 'rgba(16, 185, 129, 0.1)',
    AGENDADO: 'rgba(99, 102, 241, 0.1)',
    CONCLUIDO: 'rgba(16, 185, 129, 0.15)',
    CANCELADO: 'rgba(239, 68, 68, 0.1)',
    NEGADO: 'rgba(239, 68, 68, 0.1)',
};

const statusLabel: Record<string, string> = {
    PENDENTE: 'Pendente',
    EM_ANALISE: 'Em Análise',
    APROVADO: 'Aprovado',
    AGENDADO: 'Agendado',
    CONCLUIDO: 'Concluído',
    CANCELADO: 'Cancelado',
    NEGADO: 'Negado',
};

export default function TransporteTerceirizadoPage() {
    const [processos, setProcessos] = useState<Processo[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [empresaFilter, setEmpresaFilter] = useState('');
    const [empresas, setEmpresas] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/processos', { params: { terceirizados: 'true' } });
            setProcessos(data.pacientes || data.processos || []);
        } catch {
            toast.error('Erro ao carregar processos com transporte terceirizado.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchEmpresas = useCallback(async () => {
        try {
            const { data } = await api.get('/empresas-transporte');
            setEmpresas(data);
        } catch {
            // silent
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchEmpresas();
    }, [fetchData, fetchEmpresas]);

    const processosFiltrados = processos.filter((p: Processo) => {
        const matchSearch = p.paciente.nome.toLowerCase().includes(search.toLowerCase()) ||
            p.paciente.cpf.includes(search) ||
            p.numero.toLowerCase().includes(search.toLowerCase());
        const matchEmpresa = !empresaFilter || p.empresaTransporte?.id === empresaFilter;
        return matchSearch && matchEmpresa;
    });

    const totalPorEmpresa = empresas.reduce((acc, emp) => {
        acc[emp.id] = processosFiltrados.filter((p: Processo) => p.empresaTransporte?.id === emp.id).length;
        return acc;
    }, {} as Record<string, number>);

    return (
        <>
            <div className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="icon-circle" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                        <Truck size={20} style={{ color: '#f59e0b' }} />
                    </div>
                    <div>
                        <h2>Transporte Terceirizado</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Controle de processos com empresas contratadas</p>
                    </div>
                </div>
            </div>

            <div className="page">
                {/* Cards de resumo */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                    <div className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Total de Processos</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>{processosFiltrados.length}</div>
                    </div>
                    {empresas.slice(0, 4).map(emp => (
                        <div key={emp.id} className="card" style={{ padding: 16, cursor: 'pointer', border: empresaFilter === emp.id ? '2px solid var(--accent)' : '1px solid var(--border)' }}
                            onClick={() => setEmpresaFilter(empresaFilter === emp.id ? '' : emp.id)}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{emp.nome}</div>
                            <div style={{ fontSize: 24, fontWeight: 700 }}>{totalPorEmpresa[emp.id] || 0}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{emp.tipo}</div>
                        </div>
                    ))}
                </div>

                <div className="filters-bar">
                    <div className="search-box">
                        <Search size={15} />
                        <input className="form-control" placeholder="Buscar por paciente, CPF ou processo..."
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    {empresaFilter && (
                        <button className="btn btn-outline btn-sm" onClick={() => setEmpresaFilter('')}>
                            Limpar filtro da empresa
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : processosFiltrados.length === 0 ? (
                    <div className="empty-state">
                        <Truck size={40} style={{ opacity: 0.2 }} />
                        <p>Nenhum processo com transporte terceirizado encontrado</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Processo</th>
                                    <th>Paciente</th>
                                    <th>Empresa</th>
                                    <th>Destino</th>
                                    <th>Status</th>
                                    <th>Data Criação</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processosFiltrados.map((p: Processo) => (
                                    <tr key={p.id}>
                                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.numero}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{p.paciente.nome}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>CPF: {p.paciente.cpf}</div>
                                        </td>
                                        <td>
                                            {p.empresaTransporte ? (
                                                <>
                                                    <div style={{ fontWeight: 500, fontSize: 13 }}>{p.empresaTransporte.nome}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CNPJ: {p.empresaTransporte.cnpj}</div>
                                                </>
                                            ) : (
                                                <span style={{ color: 'var(--danger)', fontSize: 12 }}>Não informada</span>
                                            )}
                                        </td>
                                        <td>{p.cidadeDestino}/{p.ufDestino}</td>
                                        <td>
                                            <span className="badge" style={{ background: statusColors[p.status] || 'rgba(128,128,128,0.1)', color: 'var(--text)' }}>
                                                {statusLabel[p.status] || p.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12 }}>{format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</td>
                                        <td>
                                            <button className="btn btn-icon btn-outline btn-sm"
                                                onClick={() => window.open(`/processos/${p.id}`, '_blank')}
                                                title="Ver processo">
                                                <FileText size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

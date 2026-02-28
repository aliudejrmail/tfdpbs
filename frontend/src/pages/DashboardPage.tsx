import { useEffect, useState } from 'react';
import api from '../lib/api';
import type { DashboardStats, ProcessoTFD } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StatusBadge from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Package } from 'lucide-react';

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentes, setRecentes] = useState<ProcessoTFD[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        api.get('/dashboard').then(r => {
            setStats(r.data.stats);
            setRecentes(r.data.recentes);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="spinner-center"><div className="spinner" /></div>;

    return (
        <>
            <div className="topbar">
                <div>
                    <h2>Dashboard</h2>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Bem-vindo, {user?.nome}
                    </p>
                </div>
            </div>
            <div className="page">
                {stats && (
                    <div className="stats-grid">
                        <div className="stat-card total">
                            <div className="stat-label">Total de Processos</div>
                            <div className="stat-value">{stats.total}</div>
                        </div>
                        <div className="stat-card pendente">
                            <div className="stat-label">Pendentes</div>
                            <div className="stat-value">{stats.pendentes}</div>
                        </div>
                        <div className="stat-card analise">
                            <div className="stat-label">Em Análise</div>
                            <div className="stat-value">{stats.emAnalise}</div>
                        </div>
                        <div className="stat-card aprovado">
                            <div className="stat-label">Aprovados</div>
                            <div className="stat-value">{stats.aprovados}</div>
                        </div>
                        <div className="stat-card agendado">
                            <div className="stat-label">Agendados</div>
                            <div className="stat-value">{stats.agendados}</div>
                        </div>
                        <div className="stat-card negado">
                            <div className="stat-label">Negados</div>
                            <div className="stat-value">{stats.negados}</div>
                        </div>
                        <div className="stat-card concluido">
                            <div className="stat-label">Concluídos</div>
                            <div className="stat-value">{stats.concluidos}</div>
                        </div>
                    </div>
                )}

                <div className="section-title">
                    <Activity size={18} />
                    Processos Recentes
                </div>

                {recentes.length === 0 ? (
                    <div className="empty-state">
                        <Package size={40} style={{ opacity: 0.3 }} />
                        <p>Nenhum processo encontrado</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Número</th>
                                    <th>Paciente</th>
                                    <th>Especialidade</th>
                                    <th>Unidade</th>
                                    <th>Status</th>
                                    <th>Prioridade</th>
                                    <th>Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentes.map(p => (
                                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/processos/${p.id}`)}>
                                        <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)' }}>{p.numero}</td>
                                        <td>{p.paciente?.nome}</td>
                                        <td>{p.especialidade}</td>
                                        <td style={{ fontSize: 12 }}>{p.unidadeOrigem?.nome}</td>
                                        <td><StatusBadge status={p.status} /></td>
                                        <td>
                                            <span className={`badge prioridade-${p.prioridade}`}>
                                                {p.prioridade === 1 ? 'Normal' : p.prioridade === 2 ? 'Urgente' : 'Emergência'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {format(new Date(p.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
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

import { useEffect, useState } from 'react';
import api from '../lib/api';
import type { DashboardStats, DashboardMetricas, ProcessoTFD } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StatusBadge from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Package, TrendingUp, Building2, Stethoscope, Calendar, Clock } from 'lucide-react';

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
    const [recentes, setRecentes] = useState<ProcessoTFD[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        api.get('/dashboard').then(r => {
            setStats(r.data.stats);
            setMetricas(r.data.metricas);
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

                {/* Novas Métricas */}
                {metricas && (
                    <>
                        <div className="section-title">
                            <TrendingUp size={18} />
                            Métricas de Desempenho
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
                            <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ padding: 10, borderRadius: 8, background: 'rgba(0,194,168,0.1)' }}>
                                    <Clock size={20} style={{ color: 'var(--accent)' }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tempo Médio de Aprovação</div>
                                    <div style={{ fontSize: 20, fontWeight: 700 }}>{metricas.tempoMedioAprovacao} dias</div>
                                </div>
                            </div>
                            <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.1)' }}>
                                    <Calendar size={20} style={{ color: 'var(--success)' }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aprovados (3 meses)</div>
                                    <div style={{ fontSize: 20, fontWeight: 700 }}>{metricas.processosAprovadosMes}</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
                            {/* Ranking de Unidades */}
                            <div className="card" style={{ padding: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <Building2 size={18} style={{ color: 'var(--info)' }} />
                                    <strong>Unidades que Mais Solicitam</strong>
                                </div>
                                {metricas.rankingUnidades.length === 0 ? (
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhuma unidade encontrada</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {metricas.rankingUnidades.map((u, i) => (
                                            <div key={u.cnes} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ 
                                                    width: 24, height: 24, borderRadius: '50%', 
                                                    background: i === 0 ? 'rgba(234,179,8,0.2)' : i === 1 ? 'rgba(148,163,184,0.2)' : i === 2 ? 'rgba(234,179,8,0.1)' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 700, fontSize: 11, color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : 'var(--text-muted)'
                                                }}>{i + 1}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{u.nome}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CNES: {u.cnes}</div>
                                                </div>
                                                <span className="badge">{u.total}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Especialidades Top */}
                            <div className="card" style={{ padding: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <Stethoscope size={18} style={{ color: 'var(--danger)' }} />
                                    <strong>Especialidades Mais Solicitadas</strong>
                                </div>
                                {metricas.especialidadesTop.length === 0 ? (
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhuma especialidade encontrada</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {metricas.especialidadesTop.map((e, i) => (
                                            <div key={e.especialidade} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ 
                                                    width: 24, height: 24, borderRadius: '50%', 
                                                    background: 'rgba(0,194,168,0.1)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 700, fontSize: 11, color: 'var(--accent)'
                                                }}>{i + 1}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{e.especialidade}</div>
                                                </div>
                                                <span className="badge">{e.total}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
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

import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import type { ProcessoTFD } from '../types';
import { format } from 'date-fns';
import StatusBadge from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowRight } from 'lucide-react';

export default function FilaEspecialidadePage() {
    const [processos, setProcessos] = useState<ProcessoTFD[]>([]);
    const [especialidades, setEspecialidades] = useState<string[]>([]);
    const [especialidadeSelected, setEspecialidadeSelected] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchEspecialidades = async () => {
        try {
            const { data } = await api.get('/processos/especialidades');
            setEspecialidades(data);
            if (data.length > 0 && !especialidadeSelected) {
                setEspecialidadeSelected(data[0]);
            }
        } catch (err) {
            console.error('Erro ao buscar especialidades', err);
        }
    };

    const fetchFila = useCallback(async () => {
        if (!especialidadeSelected) return;
        setLoading(true);
        try {
            const { data } = await api.get('/processos', {
                params: {
                    especialidade: especialidadeSelected,
                    status: 'PENDENTE,EM_ANALISE',
                    sort: 'fila' // Custom flag for backend to use FIFO
                }
            });
            setProcessos(data.processos);
        } catch (err) {
            console.error('Erro ao buscar fila', err);
        } finally {
            setLoading(false);
        }
    }, [especialidadeSelected]);

    useEffect(() => { fetchEspecialidades(); }, []);
    useEffect(() => { fetchFila(); }, [fetchFila]);

    const getPosicao = (index: number) => {
        return index + 1;
    };

    return (
        <>
            <div className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="icon-circle accent">
                        <Filter size={18} />
                    </div>
                    <div>
                        <h2>Fila de Espera</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gestão cronológica por especialidade</p>
                    </div>
                </div>
            </div>

            <div className="page">
                <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Selecionar Especialidade:</label>
                        <select
                            className="form-control"
                            style={{ flex: 1, maxWidth: 400 }}
                            value={especialidadeSelected}
                            onChange={(e) => setEspecialidadeSelected(e.target.value)}
                        >
                            <option value="">Selecione uma especialidade...</option>
                            {especialidades.map(esp => <option key={esp} value={esp}>{esp}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : processos.length === 0 ? (
                    <div className="empty-state card">
                        <Search size={40} style={{ opacity: 0.2 }} />
                        <p>Nenhum processo em fila para esta especialidade.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {processos.map((p, index) => (
                            <div
                                className="card"
                                key={p.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 20,
                                    padding: '16px 24px',
                                    borderLeft: `4px solid ${p.prioridade === 3 ? 'var(--danger)' : p.prioridade === 2 ? 'var(--warning)' : 'var(--accent)'}`,
                                    cursor: 'pointer'
                                }}
                                onClick={() => navigate(`/processos/${p.id}`)}
                            >
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: 'var(--bg-input)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: 18,
                                    color: 'var(--accent)'
                                }}>
                                    {getPosicao(index)}º
                                </div>

                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: 0 }}>{p.paciente?.nome}</h4>
                                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                        <span>Processo: <strong>{p.numero}</strong></span>
                                        <span>Solicitado em: {format(new Date(p.createdAt), 'dd/MM/yyyy')}</span>
                                        <span>Origem: {p.unidadeOrigem?.nome}</span>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                                    <StatusBadge status={p.status} />
                                    <span style={{ fontSize: 11, fontWeight: 600, color: p.prioridade === 3 ? 'var(--danger-light)' : p.prioridade === 2 ? 'var(--warning-light)' : 'var(--text-dim)' }}>
                                        {p.prioridade === 3 ? 'EMERGÊNCIA' : p.prioridade === 2 ? 'URGENTE' : 'NORMAL'}
                                    </span>
                                </div>

                                <ArrowRight size={18} color="var(--border)" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

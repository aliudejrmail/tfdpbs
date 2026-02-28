import { useState } from 'react';
import api from '../lib/api';
import { Search, Activity, Clock, MapPin, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';

interface ConsultaResult {
    numero: string;
    paciente: string;
    unidadeOrigem: string;
    especialidade: string;
    status: string;
    dataAgendada?: string;
    localAtendimento?: string;
    motivoNegativa?: string;
    updatedAt: string;
}

const statusMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    PENDENTE: { label: 'Pendente', icon: <Clock size={20} />, color: '#d97706' },
    EM_ANALISE: { label: 'Em Análise', icon: <Activity size={20} />, color: '#2563eb' },
    APROVADO: { label: 'Aprovado', icon: <CheckCircle size={20} />, color: '#059669' },
    NEGADO: { label: 'Negado', icon: <XCircle size={20} />, color: '#e53e3e' },
    AGENDADO: { label: 'Agendado', icon: <Calendar size={20} />, color: '#00c2a8' },
    CONCLUIDO: { label: 'Concluído', icon: <CheckCircle size={20} />, color: '#059669' },
    CANCELADO: { label: 'Cancelado', icon: <XCircle size={20} />, color: '#94a3b8' },
    RECURSO: { label: 'Recurso', icon: <AlertCircle size={20} />, color: '#fbbf24' },
};

export default function ConsultaPublicaPage() {
    const [identificador, setIdentificador] = useState('');
    const [result, setResult] = useState<ConsultaResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identificador.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const { data } = await api.get('/public/consulta', { params: { identificador } });
            setResult(data);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Nenhum processo encontrado para este identificador.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card" style={{ maxWidth: 540 }}>
                <div className="login-logo">
                    <div className="icon-wrap">
                        <Activity size={28} color="white" />
                    </div>
                    <h1>tfdpbs</h1>
                    <p>Consulta Pública de Processos</p>
                </div>

                <form className="login-form" onSubmit={handleSearch}>
                    <div className="form-group">
                        <label className="form-label">CPF ou Número do Processo</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="form-control"
                                type="text"
                                placeholder="Digite aqui..."
                                value={identificador}
                                onChange={e => setIdentificador(e.target.value)}
                                style={{ paddingRight: 48 }}
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    position: 'absolute',
                                    right: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--accent)',
                                    cursor: 'pointer'
                                }}
                            >
                                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Search size={20} />}
                            </button>
                        </div>
                    </div>
                </form>

                {error && (
                    <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>
                )}

                {result && (
                    <div className="result-card" style={{ marginTop: 24, padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Processo</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{result.numero}</div>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 12px',
                                borderRadius: 20,
                                background: statusMap[result.status]?.color + '15',
                                color: statusMap[result.status]?.color,
                                fontSize: 13,
                                fontWeight: 600
                            }}>
                                {statusMap[result.status]?.icon}
                                {statusMap[result.status]?.label}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Paciente</div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{result.paciente}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Especialidade</div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{result.especialidade}</div>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Unidade de Origem</div>
                                <div style={{ fontSize: 14 }}>{result.unidadeOrigem}</div>
                            </div>
                        </div>

                        {(result.dataAgendada || result.localAtendimento) && (
                            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {result.dataAgendada && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                                        <Calendar size={16} color="var(--accent)" />
                                        <span><strong>Data:</strong> {new Date(result.dataAgendada).toLocaleDateString()} às {new Date(result.dataAgendada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                )}
                                {result.localAtendimento && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                                        <MapPin size={16} color="var(--accent)" />
                                        <span><strong>Local:</strong> {result.localAtendimento}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {result.status === 'NEGADO' && result.motivoNegativa && (
                            <div style={{ marginTop: 16, padding: 12, background: 'rgba(229,62,62,0.1)', borderRadius: 8, border: '1px solid rgba(229,62,62,0.2)', fontSize: 13, color: '#fca5a5' }}>
                                <strong>Motivo da Negativa:</strong><br />
                                {result.motivoNegativa}
                            </div>
                        )}

                        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
                            Última atualização em: {new Date(result.updatedAt).toLocaleString()}
                        </div>
                    </div>
                )}

                <div style={{ marginTop: 24, textAlign: 'center' }}>
                    <a href="/login" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>Área Restrita (Servidor)</a>
                </div>
            </div>
        </div>
    );
}

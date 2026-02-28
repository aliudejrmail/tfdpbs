import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Shield, FileText } from 'lucide-react';

interface ValidacaoResult {
    valido: boolean;
    mensagem: string;
    processo?: {
        numero: string;
        paciente: string;
        status: string;
        especialidade: string;
        unidade: string;
        criadoEm: string;
    };
}

export default function ValidarDocumentoPage() {
    const { hash } = useParams<{ hash: string }>();
    const [result, setResult] = useState<ValidacaoResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const validar = async () => {
            try {
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';
                const res = await fetch(`${baseUrl}/api/qrcode/validar/${hash}`);
                const data = await res.json();
                setResult(data);
            } catch {
                setResult({ valido: false, mensagem: 'Erro ao validar documento.' });
            } finally {
                setLoading(false);
            }
        };
        if (hash) validar();
    }, [hash]);

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 50%, #16213e 100%)',
            padding: 20,
        }}>
            <div style={{
                maxWidth: 420,
                width: '100%',
                backgroundColor: 'var(--bg-primary, #1a1a2e)',
                borderRadius: 16,
                padding: 32,
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
            }}>
                <div style={{ marginBottom: 24 }}>
                    <Shield size={40} style={{ color: 'var(--accent, #00d2ff)', marginBottom: 12 }} />
                    <h2 style={{ margin: 0, fontSize: 20, color: '#fff' }}>Validação de Documento</h2>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>Sistema TFD</p>
                </div>

                {loading ? (
                    <div style={{ padding: 40 }}>
                        <div className="spinner" />
                        <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.6)' }}>Verificando autenticidade...</p>
                    </div>
                ) : result ? (
                    <>
                        <div style={{
                            padding: 20,
                            borderRadius: 12,
                            backgroundColor: result.valido ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${result.valido ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            marginBottom: 20,
                        }}>
                            {result.valido ? (
                                <CheckCircle2 size={48} style={{ color: '#10b981' }} />
                            ) : (
                                <XCircle size={48} style={{ color: '#ef4444' }} />
                            )}
                            <h3 style={{
                                margin: '12px 0 4px',
                                color: result.valido ? '#10b981' : '#ef4444',
                                fontSize: 18,
                            }}>
                                {result.valido ? '✓ Documento Autêntico' : '✕ Documento Inválido'}
                            </h3>
                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                                {result.mensagem}
                            </p>
                        </div>

                        {result.valido && result.processo && (
                            <div style={{
                                textAlign: 'left',
                                padding: 16,
                                borderRadius: 10,
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'rgba(255,255,255,0.7)' }}>
                                    <FileText size={16} />
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>Dados do Processo</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {[
                                        ['Processo', result.processo.numero],
                                        ['Paciente', result.processo.paciente],
                                        ['Especialidade', result.processo.especialidade],
                                        ['Status', result.processo.status],
                                        ['Unidade', result.processo.unidade],
                                        ['Data', fmtDate(result.processo.criadoEm)],
                                    ].map(([label, value]) => (
                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                                            <span style={{ color: '#fff', fontWeight: 500 }}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : null}

                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 20 }}>
                    Hash: {hash}
                </p>
            </div>
        </div>
    );
}

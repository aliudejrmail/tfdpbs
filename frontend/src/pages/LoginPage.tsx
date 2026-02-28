import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const { login, token, loading } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ login: '', senha: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        if (token) {
            navigate('/dashboard', { replace: true });
        }
    }, [token, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await login(form.login, form.senha);
            toast.success('Bem-vindo ao sistema TFD!');
            navigate('/dashboard');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Falha ao realizar login.';
            setError(msg);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">
                    <div className="icon-wrap">
                        <Activity size={28} color="white" />
                    </div>
                    <h1>tfdpbs</h1>
                    <p>Tratamento Fora de Domicílio</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="alert alert-error">{error}</div>
                    )}
                    <div className="form-group">
                        <label className="form-label">Login</label>
                        <input
                            className="form-control"
                            type="text"
                            placeholder="Digite seu login"
                            value={form.login}
                            onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                            autoComplete="username"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Senha</label>
                        <input
                            className="form-control"
                            type="password"
                            placeholder="Digite sua senha"
                            value={form.senha}
                            onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    <button className="btn btn-accent btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                        {loading ? <span className="spinner" /> : 'Entrar'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', marginTop: 24 }}>
                    DIRCA — Direção de Regulação, Controle e Avaliação
                </p>
            </div>
        </div>
    );
}

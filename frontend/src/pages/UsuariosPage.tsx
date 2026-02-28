import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import type { Usuario, Unidade } from '../types';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const PERFIL_LABELS: Record<string, string> = {
    UBS: 'UBS', REGULACAO: 'Regulação', SEC_ADM: 'Sec. Adm.', ATENDENTE: 'Atendente',
};

export default function UsuariosPage() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [unidades, setUnidades] = useState<Unidade[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ nome: '', login: '', senha: '', perfil: 'ATENDENTE', unidadeId: '' });
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [u, un] = await Promise.all([api.get('/usuarios'), api.get('/unidades')]);
            setUsuarios(u.data);
            setUnidades(un.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/usuarios', { ...form, unidadeId: form.unidadeId || undefined });
            toast.success('Usuário criado!');
            setShowModal(false);
            setForm({ nome: '', login: '', senha: '', perfil: 'ATENDENTE', unidadeId: '' });
            fetchData();
        } catch (err: unknown) {
            toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao criar.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (id: string) => {
        await api.patch(`/usuarios/${id}/toggle-ativo`);
        fetchData();
    };

    const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

    return (
        <>
            <div className="topbar">
                <h2>Usuários</h2>
                <button className="btn btn-accent" onClick={() => setShowModal(true)}>
                    <Plus size={16} />
                    Novo Usuário
                </button>
            </div>

            <div className="page">
                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Login</th>
                                    <th>Perfil</th>
                                    <th>Unidade</th>
                                    <th>Status</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map(u => (
                                    <tr key={u.id}>
                                        <td style={{ fontWeight: 500 }}>{u.nome}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.login}</td>
                                        <td>
                                            <span className="badge" style={{ background: 'rgba(37,99,235,0.15)', color: '#93c5fd' }}>
                                                {PERFIL_LABELS[u.perfil]}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12 }}>{u.unidade?.nome || '—'}</td>
                                        <td>
                                            <span className={`badge ${u.ativo ? 'APROVADO' : 'CANCELADO'}`}>
                                                {u.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={`btn btn-sm ${u.ativo ? 'btn-danger' : 'btn-outline'}`}
                                                onClick={() => handleToggle(u.id)}
                                            >
                                                {u.ativo ? 'Desativar' : 'Ativar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <span className="modal-title">Novo Usuário</span>
                            <button className="btn btn-icon btn-outline" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nome Completo *</label>
                                    <input className="form-control" required value={form.nome} onChange={e => set('nome', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Login *</label>
                                    <input className="form-control" required value={form.login} onChange={e => set('login', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Senha *</label>
                                    <input type="password" className="form-control" required minLength={6} value={form.senha} onChange={e => set('senha', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Perfil *</label>
                                    <select className="form-control" value={form.perfil} onChange={e => set('perfil', e.target.value)}>
                                        <option value="UBS">UBS</option>
                                        <option value="REGULACAO">Regulação</option>
                                        <option value="SEC_ADM">Sec. Adm.</option>
                                        <option value="ATENDENTE">Atendente</option>
                                    </select>
                                </div>
                                {form.perfil === 'UBS' && (
                                    <div className="form-group">
                                        <label className="form-label">Unidade (obrigatório para UBS)</label>
                                        <select className="form-control" value={form.unidadeId} onChange={e => set('unidadeId', e.target.value)}>
                                            <option value="">Selecione...</option>
                                            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent" disabled={saving}>
                                    {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Criar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

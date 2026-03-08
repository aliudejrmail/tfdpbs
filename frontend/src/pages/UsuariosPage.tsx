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
    const [editModal, setEditModal] = useState<{ open: boolean, usuario?: Usuario | null }>({ open: false, usuario: null });
    const [editForm, setEditForm] = useState({ nome: '', login: '', senha: '', perfil: 'ATENDENTE', unidadeId: '' });
    const [resetModal, setResetModal] = useState<{ open: boolean, usuario?: Usuario | null }>({ open: false, usuario: null });
    const [resetSenha, setResetSenha] = useState('');
    const [toggleModal, setToggleModal] = useState<{ open: boolean, usuario?: Usuario | null }>({ open: false, usuario: null });

    const openResetModal = (usuario: Usuario) => {
        setResetSenha('');
        setResetModal({ open: true, usuario });
    };

    const handleResetSenha = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetModal.usuario) return;
        setSaving(true);
        try {
            await api.put(`/usuarios/${resetModal.usuario.id}`, { senha: resetSenha });
            toast.success('Senha redefinida!');
            setResetModal({ open: false, usuario: null });
            fetchData();
        } catch (err: unknown) {
            toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao redefinir senha.');
        } finally {
            setSaving(false);
        }
    };

    const openToggleModal = (usuario: Usuario) => {
        setToggleModal({ open: true, usuario });
    };

    const handleToggleConfirm = async () => {
        if (!toggleModal.usuario) return;
        setSaving(true);
        try {
            await api.patch(`/usuarios/${toggleModal.usuario.id}/toggle-ativo`);
            toast.success(toggleModal.usuario.ativo ? 'Usuário bloqueado!' : 'Usuário desbloqueado!');
            setToggleModal({ open: false, usuario: null });
            fetchData();
        } catch (err: unknown) {
            toast.error('Erro ao alterar status.');
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (usuario: Usuario) => {
        setEditForm({
            nome: usuario.nome,
            login: usuario.login,
            senha: '',
            perfil: usuario.perfil,
            unidadeId: usuario.unidadeId || ''
        });
        setEditModal({ open: true, usuario });
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editModal.usuario) return;
        setSaving(true);
        try {
            const payload: any = { ...editForm };
            if (!editForm.senha) delete payload.senha;
            await api.put(`/usuarios/${editModal.usuario.id}`, payload);
            toast.success('Usuário atualizado!');
            setEditModal({ open: false, usuario: null });
            fetchData();
        } catch (err: unknown) {
            toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao editar.');
        } finally {
            setSaving(false);
        }
    };

    const setEdit = (field: string, value: string) => setEditForm(f => ({ ...f, [field]: value }));

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
                                                className="btn btn-sm btn-outline"
                                                style={{ marginRight: 4 }}
                                                onClick={() => openEditModal(u)}
                                            >Editar</button>
                                            <button
                                                className="btn btn-sm btn-outline"
                                                style={{ marginRight: 4 }}
                                                onClick={() => openResetModal(u)}
                                            >Resetar Senha</button>
                                            <button
                                                className={`btn btn-sm ${u.ativo ? 'btn-danger' : 'btn-outline'}`}
                                                onClick={() => openToggleModal(u)}
                                                disabled={u.login === 'admin'}
                                                title={u.login === 'admin' ? 'O administrador não pode ser desativado' : ''}
                                                style={{ opacity: u.login === 'admin' ? 0.5 : 1 }}
                                            >
                                                {u.ativo ? 'Bloquear' : 'Desbloquear'}
                                            </button>
                                            {/* Modal de confirmação de bloqueio/desbloqueio */}
                                            {toggleModal.open && toggleModal.usuario && (
                                                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setToggleModal({ open: false, usuario: null })}>
                                                    <div className="modal" style={{ maxWidth: 400 }}>
                                                        <div className="modal-header">
                                                            <span className="modal-title">{toggleModal.usuario.ativo ? 'Bloquear Usuário' : 'Desbloquear Usuário'}</span>
                                                            <button className="btn btn-icon btn-outline" onClick={() => setToggleModal({ open: false, usuario: null })}><X size={16} /></button>
                                                        </div>
                                                        <div className="modal-body">
                                                            <p>Tem certeza que deseja {toggleModal.usuario.ativo ? 'bloquear' : 'desbloquear'} o usuário <b>{toggleModal.usuario.nome}</b>?</p>
                                                        </div>
                                                        <div className="modal-footer">
                                                            <button type="button" className="btn btn-outline" onClick={() => setToggleModal({ open: false, usuario: null })}>Cancelar</button>
                                                            <button type="button" className="btn btn-accent" disabled={saving} onClick={handleToggleConfirm}>
                                                                {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (toggleModal.usuario.ativo ? 'Bloquear' : 'Desbloquear')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        {/* Modal de reset de senha */}
                                        {resetModal.open && (
                                            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setResetModal({ open: false, usuario: null })}>
                                                <div className="modal" style={{ maxWidth: 400 }}>
                                                    <div className="modal-header">
                                                        <span className="modal-title">Resetar Senha</span>
                                                        <button className="btn btn-icon btn-outline" onClick={() => setResetModal({ open: false, usuario: null })}><X size={16} /></button>
                                                    </div>
                                                    <form onSubmit={handleResetSenha}>
                                                        <div className="modal-body">
                                                            <div className="form-group">
                                                                <label className="form-label">Nova Senha *</label>
                                                                <input type="password" className="form-control" required minLength={6} value={resetSenha} onChange={e => setResetSenha(e.target.value)} />
                                                            </div>
                                                        </div>
                                                        <div className="modal-footer">
                                                            <button type="button" className="btn btn-outline" onClick={() => setResetModal({ open: false, usuario: null })}>Cancelar</button>
                                                            <button type="submit" className="btn btn-accent" disabled={saving}>
                                                                {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Salvar Senha'}
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        )}
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
            {/* Modal de edição de usuário */}
            {editModal.open && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditModal({ open: false, usuario: null })}>
                    <div className="modal" style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <span className="modal-title">Editar Usuário</span>
                            <button className="btn btn-icon btn-outline" onClick={() => setEditModal({ open: false, usuario: null })}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleEdit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nome Completo *</label>
                                    <input className="form-control" required value={editForm.nome} onChange={e => setEdit('nome', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Login *</label>
                                    <input className="form-control" required value={editForm.login} onChange={e => setEdit('login', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nova Senha</label>
                                    <input type="password" className="form-control" minLength={6} value={editForm.senha} onChange={e => setEdit('senha', e.target.value)} placeholder="Deixe em branco para não alterar" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Perfil *</label>
                                    <select className="form-control" value={editForm.perfil} onChange={e => setEdit('perfil', e.target.value)}>
                                        <option value="UBS">UBS</option>
                                        <option value="REGULACAO">Regulação</option>
                                        <option value="SEC_ADM">Sec. Adm.</option>
                                        <option value="ATENDENTE">Atendente</option>
                                    </select>
                                </div>
                                {editForm.perfil === 'UBS' && (
                                    <div className="form-group">
                                        <label className="form-label">Unidade (obrigatório para UBS)</label>
                                        <select className="form-control" value={editForm.unidadeId} onChange={e => setEdit('unidadeId', e.target.value)}>
                                            <option value="">Selecione...</option>
                                            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setEditModal({ open: false, usuario: null })}>Cancelar</button>
                                <button type="submit" className="btn btn-accent" disabled={saving}>
                                    {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* ...existing code... */}
        </>
    );
}

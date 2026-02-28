import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import type { Unidade } from '../types';
import { Plus, X, Edit2, ToggleLeft, ToggleRight, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UnidadesPage() {
    const [unidades, setUnidades] = useState<Unidade[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null);
    const [form, setForm] = useState({ nome: '', cnes: '', tipo: 'UBS' });
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/unidades');
            setUnidades(res.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (unidade?: Unidade) => {
        if (unidade) {
            setEditingUnidade(unidade);
            setForm({ nome: unidade.nome, cnes: unidade.cnes, tipo: unidade.tipo });
        } else {
            setEditingUnidade(null);
            setForm({ nome: '', cnes: '', tipo: 'UBS' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingUnidade) {
                await api.put(`/unidades/${editingUnidade.id}`, form);
                toast.success('Unidade atualizada com sucesso!');
            } else {
                await api.post('/unidades', form);
                toast.success('Unidade criada com sucesso!');
            }
            setShowModal(false);
            setForm({ nome: '', cnes: '', tipo: 'UBS' });
            setEditingUnidade(null);
            fetchData();
        } catch (err: unknown) {
            toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (id: string) => {
        await api.patch(`/unidades/${id}/toggle-ativo`);
        fetchData();
    };

    const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

    return (
        <>
            <div className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="icon-circle accent">
                        <Building2 size={18} />
                    </div>
                    <div>
                        <h2>Unidades de Saúde</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gerenciamento de UBS, Hospitais e UPAs</p>
                    </div>
                </div>
                <button className="btn btn-accent" onClick={() => handleOpenModal()}>
                    <Plus size={16} />
                    Nova Unidade
                </button>
            </div>

            <div className="page">
                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : unidades.length === 0 ? (
                    <div className="empty-state card">
                        <Building2 size={40} style={{ opacity: 0.2 }} />
                        <p>Nenhuma unidade encontrada.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>CNES</th>
                                    <th>Tipo</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {unidades.map(u => (
                                    <tr key={u.id}>
                                        <td style={{ fontWeight: 500 }}>{u.nome}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.cnes}</td>
                                        <td>
                                            <span className="badge" style={{ background: 'rgba(37,99,235,0.15)', color: '#93c5fd' }}>
                                                {u.tipo}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${u.ativo ? 'success' : 'error'}`}>
                                                {u.ativo ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                <button className="btn-icon" onClick={() => handleOpenModal(u)} title="Editar">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button className="btn-icon" onClick={() => handleToggle(u.id)} title={u.ativo ? 'Desativar' : 'Ativar'}>
                                                    {u.ativo ? <ToggleRight size={18} className="text-success" /> : <ToggleLeft size={18} className="text-muted" />}
                                                </button>
                                            </div>
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
                    <div className="modal-content" style={{ maxWidth: 450 }}>
                        <div className="modal-header">
                            <h3>{editingUnidade ? 'Editar Unidade' : 'Nova Unidade'}</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Nome da Unidade *</label>
                                    <input className="form-control" required value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: UBS Central" />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>CNES *</label>
                                        <input className="form-control" required value={form.cnes} onChange={e => set('cnes', e.target.value)} placeholder="0000000" />
                                    </div>
                                    <div className="form-group">
                                        <label>Tipo *</label>
                                        <select className="form-control" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                                            <option value="UBS">UBS</option>
                                            <option value="HOSPITAL">Hospital</option>
                                            <option value="UPA">UPA</option>
                                            <option value="OUTRO">Outro</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent" disabled={saving}>
                                    {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (editingUnidade ? 'Salvar Alterações' : 'Criar Unidade')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

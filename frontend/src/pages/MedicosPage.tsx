import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import type { Medico, Unidade } from '../types';
import { Plus, X, Edit2, ToggleLeft, ToggleRight, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MedicosPage() {
    const [medicos, setMedicos] = useState<Medico[]>([]);
    const [unidades, setUnidades] = useState<Unidade[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMedico, setEditingMedico] = useState<Medico | null>(null);
    const [form, setForm] = useState({ nome: '', crm: '', especialidade: '', unidadeId: '' });
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [mRes, uRes] = await Promise.all([
                api.get('/medicos'),
                api.get('/unidades', { params: { ativo: 'true' } })
            ]);
            setMedicos(mRes.data);
            setUnidades(uRes.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (medico?: Medico) => {
        if (medico) {
            setEditingMedico(medico);
            setForm({
                nome: medico.nome,
                crm: medico.crm,
                especialidade: medico.especialidade || '',
                unidadeId: medico.unidadeId
            });
        } else {
            setEditingMedico(null);
            setForm({ nome: '', crm: '', especialidade: '', unidadeId: '' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.unidadeId) return toast.error('Selecione uma unidade de saúde.');

        setSaving(true);
        try {
            if (editingMedico) {
                await api.put(`/medicos/${editingMedico.id}`, form);
                toast.success('Médico atualizado com sucesso!');
            } else {
                await api.post('/medicos', form);
                toast.success('Médico cadastrado com sucesso!');
            }
            setShowModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (id: string, currentlyAtivo: boolean) => {
        try {
            if (currentlyAtivo) {
                await api.delete(`/medicos/${id}`);
                toast.success('Médico desativado.');
            } else {
                await api.put(`/medicos/${id}`, { ativo: true });
                toast.success('Médico ativado.');
            }
            fetchData();
        } catch {
            toast.error('Erro ao alterar status.');
        }
    };

    const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

    return (
        <>
            <div className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="icon-circle accent">
                        <Stethoscope size={18} />
                    </div>
                    <div>
                        <h2>Médicos</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gestão de médicos e vínculo com unidades</p>
                    </div>
                </div>
                <button className="btn btn-accent" onClick={() => handleOpenModal()}>
                    <Plus size={16} />
                    Novo Médico
                </button>
            </div>

            <div className="page">
                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : medicos.length === 0 ? (
                    <div className="empty-state card">
                        <Stethoscope size={40} style={{ opacity: 0.2 }} />
                        <p>Nenhum médico encontrado.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>CRM</th>
                                    <th>Especialidade</th>
                                    <th>Unidade de Saúde</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {medicos.map(m => (
                                    <tr key={m.id}>
                                        <td style={{ fontWeight: 500 }}>{m.nome}</td>
                                        <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{m.crm}</td>
                                        <td>{m.especialidade || '-'}</td>
                                        <td>
                                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                {m.unidade?.nome}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${m.ativo ? 'success' : 'error'}`}>
                                                {m.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                <button className="btn-icon" onClick={() => handleOpenModal(m)} title="Editar">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button className="btn-icon" onClick={() => handleToggle(m.id, m.ativo)} title={m.ativo ? 'Desativar' : 'Ativar'}>
                                                    {m.ativo ? <ToggleRight size={18} className="text-success" /> : <ToggleLeft size={18} className="text-muted" />}
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
                            <h3>{editingMedico ? 'Editar Médico' : 'Novo Médico'}</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Nome Completo *</label>
                                    <input className="form-control" required value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Dr. João Silva" />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>CRM *</label>
                                        <input className="form-control" required value={form.crm} onChange={e => set('crm', e.target.value)} placeholder="0000-XX" />
                                    </div>
                                    <div className="form-group">
                                        <label>Especialidade</label>
                                        <input className="form-control" value={form.especialidade} onChange={e => set('especialidade', e.target.value)} placeholder="Ex: Cardiologia" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Unidade de Saúde *</label>
                                    <select className="form-control" required value={form.unidadeId} onChange={e => set('unidadeId', e.target.value)}>
                                        <option value="">Selecione uma unidade</option>
                                        {unidades.map(u => (
                                            <option key={u.id} value={u.id}>{u.nome} ({u.tipo})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent" disabled={saving}>
                                    {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (editingMedico ? 'Salvar Alterações' : 'Cadastrar Médico')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

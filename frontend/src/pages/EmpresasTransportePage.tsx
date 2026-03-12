import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import type { EmpresaTransporte } from '../types';
import { Search, Plus, ClipboardList, X, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmpresasTransportePage() {
    const [empresas, setEmpresas] = useState<EmpresaTransporte[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmpresa, setEditingEmpresa] = useState<EmpresaTransporte | null>(null);
    const [form, setForm] = useState({ nome: '', cnpj: '', tipo: 'AMBULANCIA', ativo: true });
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/empresas-transporte');
            setEmpresas(data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/empresas-transporte', form);
            toast.success('Empresa cadastrada!');
            setShowModal(false);
            setForm({ nome: '', cnpj: '', tipo: 'AMBULANCIA', ativo: true });
            fetchData();
        } catch (err: unknown) {
            toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao cadastrar.');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (empresa: EmpresaTransporte) => {
        setEditingEmpresa(empresa);
        setForm({
            nome: empresa.nome,
            cnpj: empresa.cnpj,
            tipo: empresa.tipo,
            ativo: empresa.ativo
        });
        setShowModal(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/empresas-transporte/${editingEmpresa!.id}`, form);
            toast.success('Empresa atualizada!');
            setShowModal(false);
            setEditingEmpresa(null);
            setForm({ nome: '', cnpj: '', tipo: 'AMBULANCIA', ativo: true });
            fetchData();
        } catch (err: unknown) {
            toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao atualizar.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;
        try {
            await api.delete(`/empresas-transporte/${id}`);
            toast.success('Empresa excluída!');
            fetchData();
        } catch {
            toast.error('Erro ao excluir empresa.');
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingEmpresa(null);
        setForm({ nome: '', cnpj: '', tipo: 'AMBULANCIA', ativo: true });
    };

    const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }));

    const empresasFiltradas = empresas.filter(e =>
        e.nome.toLowerCase().includes(search.toLowerCase()) ||
        e.cnpj.includes(search)
    );

    return (
        <>
            <div className="topbar">
                <h2>Empresas de Transporte</h2>
                <button className="btn btn-accent" onClick={() => setShowModal(true)}>
                    <Plus size={16} />
                    Nova Empresa
                </button>
            </div>

            <div className="page">
                <div className="filters-bar">
                    <div className="search-box">
                        <Search size={15} />
                        <input className="form-control" placeholder="Buscar por nome ou CNPJ..."
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>

                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : empresasFiltradas.length === 0 ? (
                    <div className="empty-state">
                        <ClipboardList size={40} style={{ opacity: 0.3 }} />
                        <p>Nenhuma empresa encontrada</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>CNPJ</th>
                                    <th>Tipo</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {empresasFiltradas.map(e => (
                                    <tr key={e.id}>
                                        <td style={{ fontWeight: 500 }}>{e.nome}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.cnpj}</td>
                                        <td>
                                            <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>
                                                {e.tipo}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${e.ativo ? 'badge-success' : 'badge-danger'}`}>
                                                {e.ativo ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-icon btn-outline btn-sm" onClick={() => handleEdit(e)} title="Editar">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button className="btn btn-icon btn-outline btn-sm" onClick={() => handleDelete(e.id)} title="Excluir">
                                                    <Trash2 size={14} />
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
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleCloseModal()}>
                    <div className="modal">
                        <div className="modal-header">
                            <span className="modal-title">{editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}</span>
                            <button className="btn btn-icon btn-outline" onClick={handleCloseModal}><X size={16} /></button>
                        </div>
                        <form onSubmit={editingEmpresa ? handleUpdate : handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nome/Razão Social *</label>
                                    <input className="form-control" required value={form.nome} onChange={e => set('nome', e.target.value)} />
                                </div>
                                <div className="form-row form-row-2">
                                    <div className="form-group">
                                        <label className="form-label">CNPJ *</label>
                                        <input className="form-control" required maxLength={18} placeholder="00.000.000/0000-00"
                                            value={form.cnpj} onChange={e => set('cnpj', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tipo de Transporte *</label>
                                        <select className="form-control" required value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                                            <option value="AMBULANCIA">Ambulância</option>
                                            <option value="VAN">Van</option>
                                            <option value="ONIBUS">Ônibus</option>
                                            <option value="TODOS">Todos</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                                        <input type="checkbox" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} />
                                        Empresa Ativa?
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Cancelar</button>
                                <button type="submit" className="btn btn-accent" disabled={saving}>
                                    {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (editingEmpresa ? 'Atualizar' : 'Cadastrar')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

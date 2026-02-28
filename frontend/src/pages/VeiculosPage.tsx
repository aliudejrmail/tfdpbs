import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { Plus, Search, Car, Edit2, ToggleLeft, ToggleRight, X, Hash, Users as UsersIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface Veiculo {
    id: string;
    placa: string;
    modelo: string;
    capacidade: number;
    ativo: boolean;
}

export default function VeiculosPage() {
    const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingVeiculo, setEditingVeiculo] = useState<Veiculo | null>(null);
    const [form, setForm] = useState({
        placa: '',
        modelo: '',
        capacidade: 4,
        ativo: true
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/veiculos', { params: { search } });
            setVeiculos(data);
        } catch (err) {
            toast.error('Erro ao carregar veículos.');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (veiculo?: Veiculo) => {
        if (veiculo) {
            setEditingVeiculo(veiculo);
            setForm({
                placa: veiculo.placa,
                modelo: veiculo.modelo,
                capacidade: veiculo.capacidade,
                ativo: veiculo.ativo
            });
        } else {
            setEditingVeiculo(null);
            setForm({
                placa: '',
                modelo: '',
                capacidade: 4,
                ativo: true
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingVeiculo) {
                await api.put(`/veiculos/${editingVeiculo.id}`, form);
                toast.success('Veículo atualizado com sucesso!');
            } else {
                await api.post('/veiculos', form);
                toast.success('Veículo cadastrado com sucesso!');
            }
            setShowModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao salvar veículo.');
        }
    };

    const toggleStatus = async (veiculo: Veiculo) => {
        try {
            await api.put(`/veiculos/${veiculo.id}`, { ativo: !veiculo.ativo });
            toast.success(`Veículo ${veiculo.ativo ? 'desativado' : 'ativado'} com sucesso!`);
            fetchData();
        } catch (err) {
            toast.error('Erro ao alterar status.');
        }
    };

    return (
        <>
            <div className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="icon-circle accent">
                        <Car size={18} />
                    </div>
                    <div>
                        <h2>Frota de Veículos</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gerenciamento de veículos municipais</p>
                    </div>
                </div>
                <button className="btn btn-accent" onClick={() => handleOpenModal()}>
                    <Plus size={16} />
                    Novo Veículo
                </button>
            </div>

            <div className="page">
                <div className="filters-bar">
                    <div className="search-box" style={{ maxWidth: 400 }}>
                        <Search size={15} />
                        <input
                            className="form-control"
                            placeholder="Buscar por placa ou modelo..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : veiculos.length === 0 ? (
                    <div className="empty-state card">
                        <Car size={40} style={{ opacity: 0.2 }} />
                        <p>Nenhum veículo encontrado.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Modelo</th>
                                    <th>Placa</th>
                                    <th>Capacidade</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {veiculos.map(v => (
                                    <tr key={v.id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{v.modelo}</div>
                                        </td>
                                        <td>
                                            <span className="badge" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                                                {v.placa}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <UsersIcon size={14} /> {v.capacidade} lugares
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${v.ativo ? 'success' : 'error'}`}>
                                                {v.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                <button className="btn-icon" onClick={() => handleOpenModal(v)} title="Editar">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button className="btn-icon" onClick={() => toggleStatus(v)} title={v.ativo ? 'Desativar' : 'Ativar'}>
                                                    {v.ativo ? <ToggleRight size={18} className="text-success" /> : <ToggleLeft size={18} className="text-muted" />}
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
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 450 }}>
                        <div className="modal-header">
                            <h3>{editingVeiculo ? 'Editar Veículo' : 'Novo Veículo'}</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Modelo / Descrição</label>
                                    <div className="input-with-icon">
                                        <Car size={16} />
                                        <input
                                            className="form-control"
                                            required
                                            placeholder="Ex: Fiat Doblo, Spin..."
                                            value={form.modelo}
                                            onChange={e => setForm({ ...form, modelo: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Placa</label>
                                        <div className="input-with-icon">
                                            <Hash size={16} />
                                            <input
                                                className="form-control"
                                                required
                                                placeholder="ABC-1234"
                                                value={form.placa}
                                                onChange={e => setForm({ ...form, placa: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Capacidade (Lugares)</label>
                                        <div className="input-with-icon">
                                            <UsersIcon size={16} />
                                            <input
                                                type="number"
                                                className="form-control"
                                                required
                                                min="1"
                                                value={form.capacidade}
                                                onChange={e => setForm({ ...form, capacidade: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent">Salvar Veículo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

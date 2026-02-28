import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { Plus, Search, User, Edit2, ToggleLeft, ToggleRight, X, Phone, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

interface Motorista {
    id: string;
    nome: string;
    cpf: string;
    cnh: string;
    telefone?: string;
    ativo: boolean;
}

export default function MotoristasPage() {
    const [motoristas, setMotoristas] = useState<Motorista[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingMotorista, setEditingMotorista] = useState<Motorista | null>(null);
    const [form, setForm] = useState({
        nome: '',
        cpf: '',
        cnh: '',
        telefone: '',
        ativo: true
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/motoristas', { params: { search } });
            setMotoristas(data);
        } catch (err) {
            toast.error('Erro ao carregar motoristas.');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (motorista?: Motorista) => {
        if (motorista) {
            setEditingMotorista(motorista);
            setForm({
                nome: motorista.nome,
                cpf: motorista.cpf,
                cnh: motorista.cnh,
                telefone: motorista.telefone || '',
                ativo: motorista.ativo
            });
        } else {
            setEditingMotorista(null);
            setForm({
                nome: '',
                cpf: '',
                cnh: '',
                telefone: '',
                ativo: true
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingMotorista) {
                await api.put(`/motoristas/${editingMotorista.id}`, form);
                toast.success('Motorista atualizado com sucesso!');
            } else {
                await api.post('/motoristas', form);
                toast.success('Motorista cadastrado com sucesso!');
            }
            setShowModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao salvar motorista.');
        }
    };

    const toggleStatus = async (motorista: Motorista) => {
        try {
            await api.put(`/motoristas/${motorista.id}`, { ativo: !motorista.ativo });
            toast.success(`Motorista ${motorista.ativo ? 'desativado' : 'ativado'} com sucesso!`);
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
                        <User size={18} />
                    </div>
                    <div>
                        <h2>Motoristas</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Controle de condutores do TFD</p>
                    </div>
                </div>
                <button className="btn btn-accent" onClick={() => handleOpenModal()}>
                    <Plus size={16} />
                    Novo Motorista
                </button>
            </div>

            <div className="page">
                <div className="filters-bar">
                    <div className="search-box" style={{ maxWidth: 400 }}>
                        <Search size={15} />
                        <input
                            className="form-control"
                            placeholder="Buscar por nome ou CPF..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : motoristas.length === 0 ? (
                    <div className="empty-state card">
                        <User size={40} style={{ opacity: 0.2 }} />
                        <p>Nenhum motorista encontrado.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>CPF</th>
                                    <th>CNH</th>
                                    <th>Telefone</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {motoristas.map(m => (
                                    <tr key={m.id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{m.nome}</div>
                                        </td>
                                        <td>{m.cpf}</td>
                                        <td>{m.cnh}</td>
                                        <td>{m.telefone || '-'}</td>
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
                                                <button className="btn-icon" onClick={() => toggleStatus(m)} title={m.ativo ? 'Desativar' : 'Ativar'}>
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
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 450 }}>
                        <div className="modal-header">
                            <h3>{editingMotorista ? 'Editar Motorista' : 'Novo Motorista'}</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Nome Completo</label>
                                    <div className="input-with-icon">
                                        <User size={16} />
                                        <input
                                            className="form-control"
                                            required
                                            value={form.nome}
                                            onChange={e => setForm({ ...form, nome: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>CPF</label>
                                        <div className="input-with-icon">
                                            <CreditCard size={16} />
                                            <input
                                                className="form-control"
                                                required
                                                placeholder="000.000.000-00"
                                                value={form.cpf}
                                                onChange={e => setForm({ ...form, cpf: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>CNH</label>
                                        <div className="input-with-icon">
                                            <CreditCard size={16} />
                                            <input
                                                className="form-control"
                                                required
                                                value={form.cnh}
                                                onChange={e => setForm({ ...form, cnh: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Telefone</label>
                                    <div className="input-with-icon">
                                        <Phone size={16} />
                                        <input
                                            className="form-control"
                                            placeholder="(00) 00000-0000"
                                            value={form.telefone}
                                            onChange={e => setForm({ ...form, telefone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent">Salvar Motorista</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { Plus, Search, Bus, Edit2, ToggleLeft, ToggleRight, X, Clock, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface LinhaOnibus {
    id: string;
    nome: string;
    empresa?: string;
    origem: string;
    destino: string;
    horarios?: string;
    ativo: boolean;
}

export default function LinhasOnibusPage() {
    const [linhas, setLinhas] = useState<LinhaOnibus[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingLinha, setEditingLinha] = useState<LinhaOnibus | null>(null);
    const [form, setForm] = useState({
        nome: '',
        empresa: '',
        origem: '',
        destino: '',
        horarios: '',
        ativo: true
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/linhas-onibus', { params: { search } });
            setLinhas(data);
        } catch (err) {
            toast.error('Erro ao carregar linhas de ônibus.');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (linha?: LinhaOnibus) => {
        if (linha) {
            setEditingLinha(linha);
            setForm({
                nome: linha.nome,
                empresa: linha.empresa || '',
                origem: linha.origem,
                destino: linha.destino,
                horarios: linha.horarios || '',
                ativo: linha.ativo
            });
        } else {
            setEditingLinha(null);
            setForm({
                nome: '',
                empresa: '',
                origem: '',
                destino: '',
                horarios: '',
                ativo: true
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingLinha) {
                await api.put(`/linhas-onibus/${editingLinha.id}`, form);
                toast.success('Linha atualizada com sucesso!');
            } else {
                await api.post('/linhas-onibus', form);
                toast.success('Linha criada com sucesso!');
            }
            setShowModal(false);
            fetchData();
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Erro ao salvar linha.';
            toast.error(typeof msg === 'string' ? msg : 'Erro de validação.');
        }
    };

    const toggleStatus = async (linha: LinhaOnibus) => {
        try {
            await api.put(`/linhas-onibus/${linha.id}`, { ativo: !linha.ativo });
            toast.success(`Linha ${linha.ativo ? 'desativada' : 'ativada'} com sucesso!`);
            fetchData();
        } catch (err) {
            toast.error('Erro ao alterar status da linha.');
        }
    };

    return (
        <>
            <div className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="icon-circle accent">
                        <Bus size={18} />
                    </div>
                    <div>
                        <h2>Linhas de Ônibus</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gerenciamento de rotas intermunicipais</p>
                    </div>
                </div>
                <button className="btn btn-accent" onClick={() => handleOpenModal()}>
                    <Plus size={16} />
                    Nova Linha
                </button>
            </div>

            <div className="page">
                <div className="filters-bar">
                    <div className="search-box" style={{ maxWidth: 400 }}>
                        <Search size={15} />
                        <input
                            className="form-control"
                            placeholder="Buscar por nome, empresa ou rota..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : linhas.length === 0 ? (
                    <div className="empty-state card">
                        <Bus size={40} style={{ opacity: 0.2 }} />
                        <p>Nenhuma linha de ônibus encontrada.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome da Linha</th>
                                    <th>Empresa</th>
                                    <th>Rota (Origem x Destino)</th>
                                    <th>Horários</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {linhas.map(linha => (
                                    <tr key={linha.id} className={!linha.ativo ? 'row-inactive' : ''}>
                                        <td style={{ fontWeight: 600 }}>{linha.nome}</td>
                                        <td>{linha.empresa || '—'}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                                <MapPin size={12} color="var(--text-muted)" />
                                                {linha.origem}
                                                <ArrowRight size={12} color="var(--border)" />
                                                {linha.destino}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                                <Clock size={12} color="var(--text-muted)" />
                                                {linha.horarios || 'Não informado'}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${linha.ativo ? 'AGENDADO' : 'CANCELADO'}`}>
                                                {linha.ativo ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button className="btn btn-icon btn-outline" onClick={() => handleOpenModal(linha)} title="Editar">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button className="btn btn-icon btn-outline" onClick={() => toggleStatus(linha)} title={linha.ativo ? 'Desativar' : 'Ativar'}>
                                                    {linha.ativo ? <ToggleRight size={18} color="var(--accent)" /> : <ToggleLeft size={18} />}
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
                    <div className="modal" style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <span className="modal-title">{editingLinha ? 'Editar Linha' : 'Nova Linha de Ônibus'}</span>
                            <button className="btn btn-icon btn-outline" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nome da Linha *</label>
                                    <input
                                        className="form-control"
                                        placeholder="Ex: Manaus x Itacoatiara (Executivo)"
                                        value={form.nome}
                                        onChange={e => setForm({ ...form, nome: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Empresa</label>
                                    <input
                                        className="form-control"
                                        placeholder="Nome da empresa transportadora"
                                        value={form.empresa}
                                        onChange={e => setForm({ ...form, empresa: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className="form-group">
                                        <label className="form-label">Origem *</label>
                                        <input
                                            className="form-control"
                                            value={form.origem}
                                            onChange={e => setForm({ ...form, origem: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Destino *</label>
                                        <input
                                            className="form-control"
                                            value={form.destino}
                                            onChange={e => setForm({ ...form, destino: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Horários</label>
                                    <input
                                        className="form-control"
                                        placeholder="Ex: 08:00, 13:30, 19:00"
                                        value={form.horarios}
                                        onChange={e => setForm({ ...form, horarios: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent">
                                    {editingLinha ? 'Salvar Alterações' : 'Criar Linha'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

// Auxiliar components
function ArrowRight({ size, color }: { size: number, color: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    );
}

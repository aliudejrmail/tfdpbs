import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import type { Paciente } from '../types';
import { Search, Plus, ClipboardList, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function PacientesPage() {
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ nome: '', cpf: '', dataNascimento: '', sexo: 'MASCULINO', nomeMae: '', telefone: '', endereco: '', bairro: '', cidade: '', uf: 'AM', cartaoSus: '' });
    const [saving, setSaving] = useState(false);
    const limit = 20;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (search) params.search = search;
            const { data } = await api.get('/pacientes', { params });
            setPacientes(data.pacientes);
            setTotal(data.total);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/pacientes', form);
            toast.success('Paciente cadastrado!');
            setShowModal(false);
            setForm({ nome: '', cpf: '', dataNascimento: '', sexo: 'MASCULINO', nomeMae: '', telefone: '', endereco: '', bairro: '', cidade: '', uf: 'AM', cartaoSus: '' });
            fetchData();
        } catch (err: unknown) {
            toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao cadastrar.');
        } finally {
            setSaving(false);
        }
    };

    const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));
    const totalPages = Math.ceil(total / limit);

    return (
        <>
            <div className="topbar">
                <h2>Pacientes</h2>
                <button className="btn btn-accent" onClick={() => setShowModal(true)}>
                    <Plus size={16} />
                    Novo Paciente
                </button>
            </div>

            <div className="page">
                <div className="filters-bar">
                    <div className="search-box">
                        <Search size={15} />
                        <input className="form-control" placeholder="Buscar por nome, CPF ou Cartão SUS..."
                            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                </div>

                {loading ? (
                    <div className="spinner-center"><div className="spinner" /></div>
                ) : pacientes.length === 0 ? (
                    <div className="empty-state">
                        <ClipboardList size={40} style={{ opacity: 0.3 }} />
                        <p>Nenhum paciente encontrado</p>
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>CPF</th>
                                        <th>Data Nasc.</th>
                                        <th>Sexo</th>
                                        <th>Cartão SUS</th>
                                        <th>Telefone</th>
                                        <th>Cidade/UF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pacientes.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: 500 }}>{p.nome}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.cpf}</td>
                                            <td style={{ fontSize: 12 }}>
                                                {format(new Date(p.dataNascimento), 'dd/MM/yyyy', { locale: ptBR })}
                                            </td>
                                            <td><span className="badge" style={{ background: p.sexo === 'FEMININO' ? 'rgba(236,72,153,0.1)' : 'rgba(59,130,246,0.1)', color: p.sexo === 'FEMININO' ? '#f9a8d4' : '#93c5fd' }}>{p.sexo === 'MASCULINO' ? 'M' : 'F'}</span></td>
                                            <td style={{ fontSize: 12 }}>{p.cartaoSus || '—'}</td>
                                            <td style={{ fontSize: 12 }}>{p.telefone || '—'}</td>
                                            <td style={{ fontSize: 12 }}>{p.cidade}/{p.uf}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="pagination">
                            <span className="page-info">{total} paciente{total !== 1 ? 's' : ''} — Pág. {page}/{totalPages}</span>
                            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</button>
                        </div>
                    </>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <span className="modal-title">Novo Paciente</span>
                            <button className="btn btn-icon btn-outline" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-row form-row-2">
                                    <div className="form-group">
                                        <label className="form-label">Nome Completo *</label>
                                        <input className="form-control" required value={form.nome} onChange={e => set('nome', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">CPF * (sem pontos)</label>
                                        <input className="form-control" required maxLength={11} value={form.cpf} onChange={e => set('cpf', e.target.value.replace(/\D/g, ''))} />
                                    </div>
                                </div>
                                <div className="form-row form-row-2">
                                    <div className="form-group">
                                        <label className="form-label">Data de Nascimento *</label>
                                        <input type="date" className="form-control" required value={form.dataNascimento} onChange={e => set('dataNascimento', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Sexo *</label>
                                        <select className="form-control" value={form.sexo} onChange={e => set('sexo', e.target.value)}>
                                            <option value="MASCULINO">Masculino</option>
                                            <option value="FEMININO">Feminino</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nome da Mãe *</label>
                                    <input className="form-control" required value={form.nomeMae} onChange={e => set('nomeMae', e.target.value)} />
                                </div>
                                <div className="form-row form-row-2">
                                    <div className="form-group">
                                        <label className="form-label">Cartão SUS</label>
                                        <input className="form-control" value={form.cartaoSus} onChange={e => set('cartaoSus', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Telefone</label>
                                        <input className="form-control" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Endereço *</label>
                                    <input className="form-control" required value={form.endereco} onChange={e => set('endereco', e.target.value)} />
                                </div>
                                <div className="form-row form-row-3">
                                    <div className="form-group">
                                        <label className="form-label">Bairro *</label>
                                        <input className="form-control" required value={form.bairro} onChange={e => set('bairro', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Cidade *</label>
                                        <input className="form-control" required value={form.cidade} onChange={e => set('cidade', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">UF *</label>
                                        <input className="form-control" required maxLength={2} value={form.uf} onChange={e => set('uf', e.target.value.toUpperCase())} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent" disabled={saving}>
                                    {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Cadastrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

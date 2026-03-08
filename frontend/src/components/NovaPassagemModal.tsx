import { useState, useEffect } from 'react';
import api from '../lib/api';
import { X, Search, Plane } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface NovaPassagemModalProps {
    onClose: () => void;
    onCreated: () => void;
}

export default function NovaPassagemModal({ onClose, onCreated }: NovaPassagemModalProps) {
    const [loading, setLoading] = useState(false);
    const [processos, setProcessos] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [selectedProcesso, setSelectedProcesso] = useState<any>(null);

    const [formData, setFormData] = useState({
        destino: '',
        dataIda: '',
        dataVolta: '',
        justificativa: '',
        necessitaUrgencia: false,
    });

    // Buscar processos para vincular
    useEffect(() => {
        if (search.length < 3) return;
        const timer = setTimeout(async () => {
            try {
                const { data } = await api.get('/processos', { params: { search, limit: 5 } });
                setProcessos(data.processos);
            } catch (err) {
                console.error(err);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedProcesso) return toast.error('Selecione um processo TFD');
        if (!formData.dataIda) return toast.error('Informe a data de ida');
        if (formData.justificativa.length < 10) return toast.error('Justificativa muito curta');

        setLoading(true);
        try {
            await api.post('/passagens-aereas', {
                ...formData,
                processoId: selectedProcesso.id,
            });
            toast.success('Solicitação de passagem criada!');
            onCreated();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao criar solicitação');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 600 }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Plane size={20} color="var(--accent)" />
                        <h3>Nova Demanda de Passagem</h3>
                    </div>
                    <button onClick={onClose} className="btn-close"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <label className="form-label">Vincular Processo TFD (Busque por número ou paciente)</label>
                    <div className="search-box" style={{ marginBottom: 10 }}>
                        <Search size={15} />
                        <input
                            className="form-control"
                            placeholder="Digite o número do processo ou nome do paciente..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {processos.length > 0 && !selectedProcesso && (
                        <div className="search-results" style={{
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            maxHeight: 150,
                            overflowY: 'auto',
                            marginBottom: 15
                        }}>
                            {processos.map(p => (
                                <div
                                    key={p.id}
                                    className="search-result-item"
                                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                    onClick={() => {
                                        setSelectedProcesso(p);
                                        setFormData(prev => ({ ...prev, destino: p.cidadeDestino }));
                                        setSearch('');
                                        setProcessos([]);
                                    }}
                                >
                                    <strong>{p.numero}</strong> - {p.paciente?.nome}
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedProcesso && (
                        <div style={{
                            backgroundColor: 'var(--bg-alt)',
                            padding: 10,
                            borderRadius: 8,
                            marginBottom: 20,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <strong>Processo Selecionado:</strong> {selectedProcesso.numero}<br />
                                <small>{selectedProcesso.paciente?.nome}</small>
                            </div>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedProcesso(null)}>Trocar</button>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                        <div className="form-group">
                            <label className="form-label">Destino</label>
                            <input
                                className="form-control"
                                required
                                value={formData.destino}
                                onChange={e => setFormData({ ...formData, destino: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Urgência?</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.necessitaUrgencia}
                                    onChange={e => setFormData({ ...formData, necessitaUrgencia: e.target.checked })}
                                />
                                Sim, requer prioridade
                            </label>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                        <div className="form-group">
                            <label className="form-label">Data de Ida</label>
                            <input
                                type="date"
                                className="form-control"
                                required
                                value={formData.dataIda}
                                onChange={e => setFormData({ ...formData, dataIda: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Data de Volta (Opcional)</label>
                            <input
                                type="date"
                                className="form-control"
                                value={formData.dataVolta}
                                onChange={e => setFormData({ ...formData, dataVolta: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Justificativa Médica para Transporte Aéreo</label>
                        <textarea
                            className="form-control"
                            rows={3}
                            required
                            placeholder="Descreva por que o paciente não pode ser transportado via terrestre..."
                            value={formData.justificativa}
                            onChange={e => setFormData({ ...formData, justificativa: e.target.value })}
                        />
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-accent" disabled={loading}>
                            {loading ? 'Criando...' : 'Solicitar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

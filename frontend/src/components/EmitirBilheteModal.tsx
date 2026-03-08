import { useState } from 'react';
import api from '../lib/api';
import { X, Ticket, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface EmitirBilheteModalProps {
    demanda: any;
    onClose: () => void;
    onUpdated: () => void;
}

export default function EmitirBilheteModal({ demanda, onClose, onUpdated }: EmitirBilheteModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        status: demanda.status || 'AUTORIZADO',
        pnr: demanda.pnr || '',
        companhiaAerea: demanda.companhiaAerea || '',
        valorTotal: demanda.valorTotal ? Number(demanda.valorTotal) : 0,
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await api.patch(`/passagens-aereas/${demanda.id}/status`, formData);
            toast.success('Demanda de passagem atualizada!');
            onUpdated();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Erro ao atualizar demanda');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 450 }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Ticket size={20} color="var(--accent)" />
                        <h3>{demanda.status === 'PENDENTE' ? 'Autorizar / Emitir Passagem' : 'Atualizar Emissão'}</h3>
                    </div>
                    <button onClick={onClose} className="btn-close"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div style={{ backgroundColor: 'var(--bg-alt)', padding: 12, borderRadius: 8, marginBottom: 15 }}>
                        <p style={{ margin: 0, fontSize: 13 }}>
                            <strong>Paciente:</strong> {demanda.processo?.paciente?.nome}<br />
                            <strong>Destino:</strong> {demanda.destino}<br />
                            <strong>Ida:</strong> {new Date(demanda.dataIda).toLocaleDateString()}
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Status da Demanda</label>
                        <select
                            className="form-control"
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="PENDENTE">Aguardando (Pendente)</option>
                            <option value="AUTORIZADO">Autorizar Compra</option>
                            <option value="EMITIDO">Emitir Bilhete (Comprado)</option>
                            <option value="CANCELADO">Cancelar Solicitação</option>
                            <option value="CONCLUIDO">Viagem Concluída</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Localizador (PNR)</label>
                        <input
                            className="form-control"
                            placeholder="Ex: XYZ123"
                            style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                            value={formData.pnr}
                            onChange={e => setFormData({ ...formData, pnr: e.target.value.toUpperCase() })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Companhia Aérea</label>
                        <input
                            className="form-control"
                            placeholder="Ex: Latam, Azul, Gol..."
                            value={formData.companhiaAerea}
                            onChange={e => setFormData({ ...formData, companhiaAerea: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Valor Total (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            value={formData.valorTotal}
                            onChange={e => setFormData({ ...formData, valorTotal: Number(e.target.value) })}
                        />
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline" onClick={onClose}>Fechar</button>
                        <button type="submit" className="btn btn-accent" disabled={loading}>
                            <CheckCircle size={16} />
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

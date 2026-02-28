import { useState, useEffect } from 'react';
import api from '../lib/api';
import type { Paciente, Unidade } from '../types';
import toast from 'react-hot-toast';
import { X, Search } from 'lucide-react';

interface Props {
    onClose: () => void;
    onCreated: () => void;
}

export default function NovoProcessoModal({ onClose, onCreated }: Props) {
    const [step, setStep] = useState(1);
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [unidades, setUnidades] = useState<Unidade[]>([]);
    const [pacienteSearch, setPacienteSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        pacienteId: '',
        unidadeOrigemId: '',
        especialidade: '',
        cid: '',
        descricaoClinica: '',
        medicoSolicitante: '',
        crmMedico: '',
        cidadeDestino: '',
        ufDestino: '',
        hospitalDestino: '',
        tipoTransporte: 'ONIBUS',
        acompanhante: false,
        nomeAcompanhante: '',
        prioridade: 1,
        observacoes: '',
    });

    useEffect(() => {
        api.get('/unidades').then(r => setUnidades(r.data));
    }, []);

    useEffect(() => {
        if (pacienteSearch.length >= 2) {
            api.get('/pacientes', { params: { search: pacienteSearch, limit: 10 } }).then(r => setPacientes(r.data.pacientes));
        } else {
            setPacientes([]);
        }
    }, [pacienteSearch]);

    const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('/processos', { ...form, prioridade: Number(form.prioridade) });
            toast.success('Processo criado com sucesso!');
            onCreated();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao criar processo.';
            toast.error(String(msg));
        } finally {
            setLoading(false);
        }
    };

    const selectedPaciente = pacientes.find(p => p.id === form.pacienteId);

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 760 }}>
                <div className="modal-header">
                    <span className="modal-title">Novo Processo TFD</span>
                    <button className="btn btn-icon btn-outline" onClick={onClose}><X size={16} /></button>
                </div>

                <div style={{ padding: '12px 24px 0', display: 'flex', gap: 8 }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                            background: step === s ? 'rgba(0,194,168,0.15)' : 'transparent',
                            color: step === s ? 'var(--accent)' : step > s ? 'var(--text-muted)' : 'var(--text-dim)',
                            border: `1px solid ${step === s ? 'rgba(0,194,168,0.4)' : 'var(--border)'}`
                        }}>
                            {s === 1 ? '1. Paciente' : s === 2 ? '2. Clínico' : '3. Logística'}
                        </div>
                    ))}
                </div>

                <div className="modal-body">
                    {step === 1 && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Buscar Paciente</label>
                                <div className="search-box">
                                    <Search size={15} />
                                    <input className="form-control" placeholder="Nome, CPF ou Cartão SUS..."
                                        value={pacienteSearch} onChange={e => setPacienteSearch(e.target.value)} />
                                </div>
                                {pacientes.length > 0 && (
                                    <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                        {pacientes.map(p => (
                                            <div key={p.id} onClick={() => { set('pacienteId', p.id); setPacienteSearch(p.nome); setPacientes([]); }}
                                                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-input)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                                <div style={{ fontWeight: 500 }}>{p.nome}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CPF: {p.cpf} | Cartão SUS: {p.cartaoSus || 'N/A'}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {form.pacienteId && selectedPaciente && (
                                    <div style={{ padding: '8px 12px', background: 'rgba(0,194,168,0.08)', border: '1px solid rgba(0,194,168,0.25)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                                        ✓ Paciente selecionado: <strong>{selectedPaciente.nome}</strong>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Unidade de Origem</label>
                                <select className="form-control" value={form.unidadeOrigemId} onChange={e => set('unidadeOrigemId', e.target.value)}>
                                    <option value="">Selecione a Unidade...</option>
                                    {unidades.map(u => <option key={u.id} value={u.id}>{u.nome} — CNES: {u.cnes}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className="form-row form-row-2">
                                <div className="form-group">
                                    <label className="form-label">Especialidade</label>
                                    <input className="form-control" placeholder="Ex: Ortopedia, Cardiologia..." value={form.especialidade} onChange={e => set('especialidade', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">CID-10</label>
                                    <input className="form-control" placeholder="Ex: M16.1" value={form.cid} onChange={e => set('cid', e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Descrição Clínica</label>
                                <textarea className="form-control" rows={4} placeholder="Descreva o quadro clínico e justificativa..."
                                    value={form.descricaoClinica} onChange={e => set('descricaoClinica', e.target.value)} />
                            </div>
                            <div className="form-row form-row-2">
                                <div className="form-group">
                                    <label className="form-label">Médico Solicitante</label>
                                    <input className="form-control" value={form.medicoSolicitante} onChange={e => set('medicoSolicitante', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">CRM</label>
                                    <input className="form-control" placeholder="Opcional" value={form.crmMedico} onChange={e => set('crmMedico', e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Prioridade</label>
                                <select className="form-control" value={form.prioridade} onChange={e => set('prioridade', Number(e.target.value))}>
                                    <option value={1}>Normal</option>
                                    <option value={2}>Urgente</option>
                                    <option value={3}>Emergência</option>
                                </select>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <div className="form-row form-row-2">
                                <div className="form-group">
                                    <label className="form-label">Cidade Destino</label>
                                    <input className="form-control" value={form.cidadeDestino} onChange={e => set('cidadeDestino', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">UF</label>
                                    <input className="form-control" maxLength={2} value={form.ufDestino} onChange={e => set('ufDestino', e.target.value.toUpperCase())} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hospital Destino</label>
                                <input className="form-control" placeholder="Opcional" value={form.hospitalDestino} onChange={e => set('hospitalDestino', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tipo de Transporte</label>
                                <select className="form-control" value={form.tipoTransporte} onChange={e => set('tipoTransporte', e.target.value)}>
                                    <option value="ONIBUS">Ônibus</option>
                                    <option value="VAN">Van</option>
                                    <option value="AMBULANCIA">Ambulância</option>
                                    <option value="AEREO">Aéreo</option>
                                    <option value="PROPRIO">Transporte Próprio</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                                    <input type="checkbox" checked={form.acompanhante} onChange={e => set('acompanhante', e.target.checked)} />
                                    Possui Acompanhante?
                                </label>
                            </div>
                            {form.acompanhante && (
                                <div className="form-group">
                                    <label className="form-label">Nome do Acompanhante</label>
                                    <input className="form-control" value={form.nomeAcompanhante} onChange={e => set('nomeAcompanhante', e.target.value)} />
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Observações</label>
                                <textarea className="form-control" rows={3} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} />
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    {step > 1 && <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>Voltar</button>}
                    <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
                    {step < 3 ? (
                        <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}
                            disabled={step === 1 && (!form.pacienteId || !form.unidadeOrigemId)}>
                            Próximo
                        </button>
                    ) : (
                        <button className="btn btn-accent" onClick={handleSubmit} disabled={loading}>
                            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Criar Processo'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../lib/api';
import {
    LayoutDashboard,
    FileText,
    Users,
    Building2,
    LogOut,
    ClipboardList,
    ListOrdered,
    Bus,
    Car,
    UserCheck,
    CalendarDays,
    DollarSign,
    Home,
    Stethoscope,
    KeyRound,
    X,
    Plane,
    Menu,
    Truck,
} from 'lucide-react';
import type { Perfil } from '../types';

const perfilLabel: Record<Perfil, string> = {
    UBS: 'UBS',
    REGULACAO: 'Regulação',
    SEC_ADM: 'Sec. Adm.',
    ATENDENTE: 'Atendente',
};

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showPassModal, setShowPassModal] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
    const [savingPass, setSavingPass] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passForm.new !== passForm.confirm) {
            toast.error('As senhas não coincidem!');
            return;
        }
        setSavingPass(true);
        try {
            await api.patch('/usuarios/me/senha', {
                senhaAtual: passForm.current,
                novaSenha: passForm.new
            });
            toast.success('Senha alterada com sucesso!');
            setShowPassModal(false);
            setPassForm({ current: '', new: '', confirm: '' });
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Erro ao alterar senha.';
            toast.error(typeof msg === 'string' ? msg : 'Erro ao alterar senha.');
        } finally {
            setSavingPass(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const initials = user?.nome
        .split(' ')
        .slice(0, 2)
        .map(n => n[0])
        .join('')
        .toUpperCase() || '?';

    const canAdmin = user?.perfil === 'SEC_ADM';
    const canSeeAll = user?.perfil !== 'UBS';

    return (
        <div className="layout">
            <button
                className="mobile-menu-toggle"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {isMenuOpen && (
                <div className="sidebar-overlay" onClick={() => setIsMenuOpen(false)} />
            )}

            <nav className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <h1>TFD Conecta</h1>
                    <p>Sistema de Gestão</p>
                    <p>Tratamento Fora de Domicílio</p>
                </div>

                <div className="sidebar-nav">
                    <NavLink to="/" end onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={18} />
                        Dashboard
                    </NavLink>

                    <NavLink to="/processos" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <FileText size={18} />
                        Processos TFD
                    </NavLink>

                    <NavLink to="/pacientes" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <ClipboardList size={18} />
                        Pacientes
                    </NavLink>

                    <NavLink to="/fila" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <ListOrdered size={18} />
                        Fila de Espera
                    </NavLink>

                    <NavLink to="/passagens-aereas" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <Plane size={18} />
                        Passagens Aéreas
                    </NavLink>

                    <NavLink to="/linhas-onibus" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <Bus size={18} />
                        Linhas de Ônibus
                    </NavLink>

                    <NavLink to="/veiculos" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <Car size={18} />
                        Frota de Veículos
                    </NavLink>

                    <NavLink to="/empresas-transporte" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <Truck size={18} />
                        Empresas de Transporte
                    </NavLink>

                    <NavLink to="/transporte-terceirizado" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <Truck size={18} />
                        Transporte Terceirizado
                    </NavLink>

                    <NavLink to="/motoristas" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <UserCheck size={18} />
                        Motoristas
                    </NavLink>

                    <NavLink to="/viagens" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <CalendarDays size={18} />
                        Escala de Viagens
                    </NavLink>

                    <NavLink to="/financeiro" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <DollarSign size={18} />
                        Financeiro
                    </NavLink>

                    <NavLink to="/casa-apoio" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <Home size={18} />
                        Casa de Apoio
                    </NavLink>

                    <NavLink to="/medicos" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <Stethoscope size={18} />
                        Médicos
                    </NavLink>

                    {canSeeAll && (
                        <NavLink to="/unidades" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                            <Building2 size={18} />
                            Unidades
                        </NavLink>
                    )}

                    {canAdmin && (
                        <NavLink to="/usuarios" onClick={() => setIsMenuOpen(false)} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                            <Users size={18} />
                            Usuários
                        </NavLink>
                    )}
                </div>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user?.nome}
                            </div>
                            <div className="user-role">{user?.perfil ? perfilLabel[user.perfil] : ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button
                                className="btn btn-icon btn-outline"
                                onClick={() => setShowPassModal(true)}
                                title="Alterar Senha"
                                style={{ padding: 6 }}
                            >
                                <KeyRound size={15} />
                            </button>
                            <button className="btn btn-icon btn-outline" onClick={handleLogout} title="Sair" style={{ padding: 6 }}>
                                <LogOut size={15} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="content">
                <Outlet />
            </main>

            {showPassModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPassModal(false)}>
                    <div className="modal" style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <span className="modal-title">Alterar Minha Senha</span>
                            <button className="btn btn-icon btn-outline" onClick={() => setShowPassModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleUpdatePassword}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Senha Atual</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        required
                                        value={passForm.current}
                                        onChange={e => setPassForm(p => ({ ...p, current: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nova Senha (min. 6 caracteres)</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        required
                                        minLength={6}
                                        value={passForm.new}
                                        onChange={e => setPassForm(p => ({ ...p, new: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirmar Nova Senha</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        required
                                        value={passForm.confirm}
                                        onChange={e => setPassForm(p => ({ ...p, confirm: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowPassModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-accent" disabled={savingPass}>
                                    {savingPass ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Salvar Nova Senha'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

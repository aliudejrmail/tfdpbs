import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
            <nav className="sidebar">
                <div className="sidebar-brand">
                    <h1>tfdpbs</h1>
                    <p>DIRCA</p>
                </div>

                <div className="sidebar-nav">
                    <NavLink to="/" end className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={18} />
                        Dashboard
                    </NavLink>

                    <NavLink to="/processos" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <FileText size={18} />
                        Processos TFD
                    </NavLink>

                    <NavLink to="/fila" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <ListOrdered size={18} />
                        Fila de Espera
                    </NavLink>

                    <NavLink to="/pacientes" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <ClipboardList size={18} />
                        Pacientes
                    </NavLink>

                    <NavLink to="/linhas-onibus" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <Bus size={18} />
                        Linhas de Ônibus
                    </NavLink>

                    <NavLink to="/veiculos" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <Car size={18} />
                        Frota de Veículos
                    </NavLink>

                    <NavLink to="/motoristas" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <UserCheck size={18} />
                        Motoristas
                    </NavLink>

                    <NavLink to="/viagens" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <CalendarDays size={18} />
                        Escala de Viagens
                    </NavLink>

                    <NavLink to="/financeiro" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <DollarSign size={18} />
                        Financeiro
                    </NavLink>

                    <NavLink to="/casa-apoio" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                        <Home size={18} />
                        Casa de Apoio
                    </NavLink>

                    {canSeeAll && (
                        <NavLink to="/unidades" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                            <Building2 size={18} />
                            Unidades
                        </NavLink>
                    )}

                    {canAdmin && (
                        <NavLink to="/usuarios" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
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
                        <button className="btn btn-icon btn-outline" onClick={handleLogout} title="Sair" style={{ padding: 6 }}>
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
            </nav>
            <main className="content">
                <Outlet />
            </main>
        </div>
    );
}

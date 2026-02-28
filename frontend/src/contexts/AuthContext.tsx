import {
    createContext,
    useContext,
    useState,
    useEffect,
} from 'react';
import type { ReactNode } from 'react';
import api from '../lib/api';
import type { Usuario } from '../types';

interface AuthContextType {
    user: Usuario | null;
    token: string | null;
    loading: boolean;
    login: (login: string, senha: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Usuario | null>(() => {
        const stored = localStorage.getItem('tfd_user');
        return stored ? JSON.parse(stored) : null;
    });
    const [token, setToken] = useState<string | null>(() =>
        localStorage.getItem('tfd_token')
    );
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (token && !user) {
            api.get('/auth/me').then(r => setUser(r.data)).catch(() => logout());
        }
    }, [token]);

    const login = async (login: string, senha: string) => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { login, senha });
            localStorage.setItem('tfd_token', data.token);
            localStorage.setItem('tfd_user', JSON.stringify(data.usuario));
            setToken(data.token);
            setUser(data.usuario);
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('tfd_token');
        localStorage.removeItem('tfd_user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}

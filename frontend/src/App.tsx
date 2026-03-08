import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProcessosPage from './pages/ProcessosPage';
import ProcessoDetailPage from './pages/ProcessoDetailPage';
import PacientesPage from './pages/PacientesPage';
import UsuariosPage from './pages/UsuariosPage';
import UnidadesPage from './pages/UnidadesPage';
import ConsultaPublicaPage from './pages/ConsultaPublicaPage';
import FilaEspecialidadePage from './pages/FilaEspecialidadePage';
import LinhasOnibusPage from './pages/LinhasOnibusPage';
import VeiculosPage from './pages/VeiculosPage';
import MotoristasPage from './pages/MotoristasPage';
import ViagensPage from './pages/ViagensPage';
import FinanceiroPage from './pages/FinanceiroPage';
import CasaApoioPage from './pages/CasaApoioPage';
import MedicosPage from './pages/MedicosPage';
import PassagensAereasPage from './pages/PassagensAereasPage';
import ValidarDocumentoPage from './pages/ValidarDocumentoPage';

import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>Validando acesso...</p>
        </div>
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/consulta" element={<ConsultaPublicaPage />} />
        <Route path="/validar/:hash" element={<ValidarDocumentoPage />} />

        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="processos" element={<ProcessosPage />} />
          <Route path="processos/:id" element={<ProcessoDetailPage />} />
          <Route path="fila" element={<FilaEspecialidadePage />} />
          <Route path="pacientes" element={<PacientesPage />} />
          <Route path="unidades" element={<UnidadesPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="linhas-onibus" element={<LinhasOnibusPage />} />
          <Route path="veiculos" element={<VeiculosPage />} />
          <Route path="motoristas" element={<MotoristasPage />} />
          <Route path="viagens" element={<ViagensPage />} />
          <Route path="financeiro" element={<FinanceiroPage />} />
          <Route path="casa-apoio" element={<CasaApoioPage />} />
          <Route path="medicos" element={<MedicosPage />} />
          <Route path="passagens-aereas" element={<PassagensAereasPage />} />
          <Route path="*" element={<div>Página não encontrada ou Rota Inválida no App</div>} />
        </Route>
        <Route path="*" element={<div>Página não encontrada no Root</div>} />
      </Routes>
    </Router>
  );
}

export default App;

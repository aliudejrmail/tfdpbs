import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.routes';
import { usuariosRouter } from './routes/usuarios.routes';
import { processosRouter } from './routes/processos.routes';
import { pacientesRouter } from './routes/pacientes.routes';
import { unidadesRouter } from './routes/unidades.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { publicRouter } from './routes/public.routes';
import { linhasOnibusRouter } from './routes/linhas-onibus.routes';
import { veiculosRouter } from './routes/veiculos.routes';
import { motoristasRouter } from './routes/motoristas.routes';
import { viagensRouter } from './routes/viagens.routes';
import { financeiroRouter } from './routes/financeiro.routes';
import { casaApoioRouter } from './routes/casa-apoio.routes';
import { qrcodeRouter } from './routes/qrcode.routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/processos', processosRouter);
app.use('/api/pacientes', pacientesRouter);
app.use('/api/unidades', unidadesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/public', publicRouter);
app.use('/api/linhas-onibus', linhasOnibusRouter);
app.use('/api/veiculos', veiculosRouter);
app.use('/api/motoristas', motoristasRouter);
app.use('/api/viagens', viagensRouter);
app.use('/api/financeiro', financeiroRouter);
app.use('/api/casas-apoio', casaApoioRouter);
app.use('/api/qrcode', qrcodeRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🚀 TFD API running on http://localhost:${PORT}`);
});

export default app;

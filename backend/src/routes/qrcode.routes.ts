import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import crypto from 'crypto';

export const qrcodeRouter = Router();

// Gera hash de autenticidade para um processo
function gerarHash(processoId: string, numero: string): string {
    return crypto.createHash('sha256').update(`${processoId}-${numero}-TFD`).digest('hex').substring(0, 16);
}

// Gerar QR Code PNG para um processo (autenticado)
qrcodeRouter.get('/gerar/:processoId', authenticate, async (req: Request, res: Response) => {
    const processo = await prisma.processoTFD.findUnique({
        where: { id: req.params.id as string || req.params.processoId as string },
        include: { paciente: true },
    });
    if (!processo) { res.status(404).json({ error: 'Processo não encontrado.' }); return; }

    const hash = gerarHash(processo.id, processo.numero);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const validationUrl = `${baseUrl}/validar/${hash}`;

    try {
        const qrDataUrl = await QRCode.toDataURL(validationUrl, {
            width: 200,
            margin: 1,
            color: { dark: '#1a1a2e', light: '#ffffff' },
        });
        res.json({
            qrCode: qrDataUrl,
            hash,
            url: validationUrl,
            processo: {
                id: processo.id,
                numero: processo.numero,
                paciente: processo.paciente.nome,
                status: processo.status,
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao gerar QR Code.' });
    }
});

// Validação pública — sem autenticação
qrcodeRouter.get('/validar/:hash', async (req: Request, res: Response) => {
    const hash = req.params.hash as string;

    // Buscar todos os processos e verificar hash
    const processos = await prisma.processoTFD.findMany({
        include: { paciente: true, unidadeOrigem: true },
    });

    const processo = processos.find(p => gerarHash(p.id, p.numero) === hash);

    if (!processo) {
        res.json({ valido: false, mensagem: 'Documento não reconhecido pelo sistema.' });
        return;
    }

    res.json({
        valido: true,
        mensagem: 'Documento autêntico.',
        processo: {
            numero: processo.numero,
            paciente: processo.paciente.nome.substring(0, 3) + '***',
            status: processo.status,
            especialidade: processo.especialidade,
            unidade: processo.unidadeOrigem?.nome || '',
            criadoEm: processo.createdAt,
        }
    });
});

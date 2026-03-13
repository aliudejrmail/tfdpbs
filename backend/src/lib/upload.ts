import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { fileTypeFromBuffer } from 'file-type';

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Validar conteúdo real do arquivo usando buffer
const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
  
  // Verificar mimetype inicial
  if (!allowedMimes.includes(file.mimetype)) {
    cb(new Error('Tipo de arquivo não permitido'));
    return;
  }
  
  // Armazenar buffer para validação posterior no middleware
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1 // Apenas 1 arquivo por upload
  },
  fileFilter
});

// Middleware para validar conteúdo do arquivo após upload
export async function validateFileContent(buffer: Buffer): Promise<boolean> {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
  const type = await fileTypeFromBuffer(buffer);
  return !!(type && allowedMimes.includes(type.mime));
}

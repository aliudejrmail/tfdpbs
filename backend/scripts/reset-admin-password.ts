/**
 * Script para redefinir a senha do usuário admin.
 * Execute: npx ts-node scripts/reset-admin-password.ts
 * Ou: npx tsx scripts/reset-admin-password.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const NOVA_SENHA = process.env.NOVA_SENHA_ADMIN || '123456';

async function main() {
    console.log('🔐 Redefinindo senha do admin...');

    const senhaHash = await bcrypt.hash(NOVA_SENHA, 10);

    const usuario = await prisma.usuario.update({
        where: { login: 'admin' },
        data: { senha: senhaHash },
    });

    console.log('✅ Senha do admin redefinida com sucesso!');
    console.log(`   Login: ${usuario.login}`);
    console.log(`   Nova senha: ${NOVA_SENHA}`);
}

main()
    .catch((e) => {
        if (e.code === 'P2025') {
            console.error('❌ Usuário admin não encontrado. Execute o seed primeiro: npx prisma db seed');
        } else {
            console.error('❌ Erro:', e.message);
        }
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

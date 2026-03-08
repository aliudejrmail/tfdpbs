import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Create units
    const ubs = await prisma.unidade.upsert({
        where: { cnes: '1234567' },
        update: {},
        create: { nome: 'UBS Central', cnes: '1234567', tipo: 'UBS' },
    });

    await prisma.unidade.upsert({
        where: { cnes: '7654321' },
        update: {},
        create: { nome: 'UBS Bairro Norte', cnes: '7654321', tipo: 'UBS' },
    });

    console.log('✅ Unidades criadas');

    // Create users
    const senhaHash = await bcrypt.hash('123456', 10);

    await prisma.usuario.upsert({
        where: { login: 'admin' },
        update: {},
        create: {
            nome: 'Administrador',
            login: 'admin',
            senha: senhaHash,
            perfil: 'SEC_ADM',
        },
    });

    await prisma.usuario.upsert({
        where: { login: 'regulacao' },
        update: {},
        create: {
            nome: 'Regulador Central',
            login: 'regulacao',
            senha: senhaHash,
            perfil: 'REGULACAO',
        },
    });

    await prisma.usuario.upsert({
        where: { login: 'ubs_central' },
        update: {},
        create: {
            nome: 'Usuário UBS Central',
            login: 'ubs_central',
            senha: senhaHash,
            perfil: 'UBS',
            unidadeId: ubs.id,
        },
    });

    await prisma.usuario.upsert({
        where: { login: 'atendente' },
        update: {},
        create: {
            nome: 'Atendente TFD',
            login: 'atendente',
            senha: senhaHash,
            perfil: 'ATENDENTE',
        },
    });

    console.log('✅ Usuários processados (Upsert)');
    console.log('\n📋 Nota: O seed não altera a senha de usuários já existentes.');
    console.log('📋 Credenciais padrão (apenas para novos bancos):');
    console.log('  admin / 123456 → SEC_ADM');
    console.log('  regulacao / 123456 → REGULACAO');
    console.log('  ubs_central / 123456 → UBS');
    console.log('  atendente / 123456 → ATENDENTE');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

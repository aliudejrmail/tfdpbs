-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('UBS', 'REGULACAO', 'SEC_ADM', 'ATENDENTE');

-- CreateEnum
CREATE TYPE "StatusProcesso" AS ENUM ('PENDENTE', 'EM_ANALISE', 'APROVADO', 'NEGADO', 'AGENDADO', 'CONCLUIDO', 'CANCELADO', 'RECURSO');

-- CreateEnum
CREATE TYPE "TipoTransporte" AS ENUM ('ONIBUS', 'VAN', 'AMBULANCIA', 'AEREO', 'PROPRIO');

-- CreateEnum
CREATE TYPE "SexoPaciente" AS ENUM ('MASCULINO', 'FEMININO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "unidadeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnes" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "sexo" "SexoPaciente" NOT NULL,
    "nomeMae" TEXT NOT NULL,
    "telefone" TEXT,
    "endereco" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL DEFAULT 'AM',
    "cep" TEXT,
    "cartaoSus" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processos_tfd" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "unidadeOrigemId" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "cid" TEXT NOT NULL,
    "descricaoClinica" TEXT NOT NULL,
    "medicoSolicitante" TEXT NOT NULL,
    "crmMedico" TEXT,
    "dataConsulta" TIMESTAMP(3),
    "cidadeDestino" TEXT NOT NULL,
    "ufDestino" TEXT NOT NULL,
    "hospitalDestino" TEXT,
    "medicoDestino" TEXT,
    "tipoTransporte" "TipoTransporte" NOT NULL,
    "acompanhante" BOOLEAN NOT NULL DEFAULT false,
    "nomeAcompanhante" TEXT,
    "cpfAcompanhante" TEXT,
    "status" "StatusProcesso" NOT NULL DEFAULT 'PENDENTE',
    "prioridade" INTEGER NOT NULL DEFAULT 1,
    "dataAgendada" TIMESTAMP(3),
    "localAtendimento" TEXT,
    "observacoes" TEXT,
    "motivoNegativa" TEXT,
    "abertoPorId" TEXT NOT NULL,
    "reguladoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processos_tfd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_processos" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "statusAnterior" "StatusProcesso",
    "statusNovo" "StatusProcesso" NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_processos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passagens" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dataViagem" TIMESTAMP(3) NOT NULL,
    "numeroPassagem" TEXT,
    "empresa" TEXT,
    "valor" DECIMAL(10,2),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passagens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_login_key" ON "usuarios"("login");

-- CreateIndex
CREATE UNIQUE INDEX "unidades_cnes_key" ON "unidades"("cnes");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_cpf_key" ON "pacientes"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_cartaoSus_key" ON "pacientes"("cartaoSus");

-- CreateIndex
CREATE UNIQUE INDEX "processos_tfd_numero_key" ON "processos_tfd"("numero");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos_tfd" ADD CONSTRAINT "processos_tfd_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos_tfd" ADD CONSTRAINT "processos_tfd_unidadeOrigemId_fkey" FOREIGN KEY ("unidadeOrigemId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos_tfd" ADD CONSTRAINT "processos_tfd_abertoPorId_fkey" FOREIGN KEY ("abertoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos_tfd" ADD CONSTRAINT "processos_tfd_reguladoPorId_fkey" FOREIGN KEY ("reguladoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_processos" ADD CONSTRAINT "historico_processos_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos_tfd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_processos" ADD CONSTRAINT "historico_processos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos_tfd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passagens" ADD CONSTRAINT "passagens_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos_tfd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

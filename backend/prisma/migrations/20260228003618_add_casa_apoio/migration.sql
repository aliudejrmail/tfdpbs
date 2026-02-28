-- CreateTable
CREATE TABLE "casas_apoio" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "cidade" TEXT NOT NULL,
    "telefone" TEXT,
    "totalLeitos" INTEGER NOT NULL DEFAULT 10,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "casas_apoio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vales_hospedagem" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "casaApoioId" TEXT NOT NULL,
    "dataEntrada" TIMESTAMP(3) NOT NULL,
    "dataSaida" TIMESTAMP(3),
    "acompanhante" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "observacoes" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vales_hospedagem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "vales_hospedagem" ADD CONSTRAINT "vales_hospedagem_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos_tfd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vales_hospedagem" ADD CONSTRAINT "vales_hospedagem_casaApoioId_fkey" FOREIGN KEY ("casaApoioId") REFERENCES "casas_apoio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vales_hospedagem" ADD CONSTRAINT "vales_hospedagem_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

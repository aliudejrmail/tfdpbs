-- CreateEnum
CREATE TYPE "StatusPassagemAerea" AS ENUM ('PENDENTE', 'AUTORIZADO', 'EMITIDO', 'CANCELADO', 'CONCLUIDO');

-- CreateTable
CREATE TABLE "demandas_passagens_aereas" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'Parauapebas',
    "destino" TEXT NOT NULL,
    "dataIda" TIMESTAMP(3) NOT NULL,
    "dataVolta" TIMESTAMP(3),
    "justificativa" TEXT NOT NULL,
    "necessitaUrgencia" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusPassagemAerea" NOT NULL DEFAULT 'PENDENTE',
    "pnr" TEXT,
    "companhiaAerea" TEXT,
    "valorTotal" DECIMAL(10,2),
    "solicitadoPorId" TEXT NOT NULL,
    "autorizadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demandas_passagens_aereas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "demandas_passagens_aereas" ADD CONSTRAINT "demandas_passagens_aereas_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos_tfd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandas_passagens_aereas" ADD CONSTRAINT "demandas_passagens_aereas_solicitadoPorId_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandas_passagens_aereas" ADD CONSTRAINT "demandas_passagens_aereas_autorizadoPorId_fkey" FOREIGN KEY ("autorizadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

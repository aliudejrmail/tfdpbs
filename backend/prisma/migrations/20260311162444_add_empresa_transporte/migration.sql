-- AlterTable
ALTER TABLE "processos_tfd" ADD COLUMN     "empresaTransporteId" TEXT,
ADD COLUMN     "transporteTerceirizado" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "empresas_transporte" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tipo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_transporte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_transporte_cnpj_key" ON "empresas_transporte"("cnpj");

-- AddForeignKey
ALTER TABLE "processos_tfd" ADD CONSTRAINT "processos_tfd_empresaTransporteId_fkey" FOREIGN KEY ("empresaTransporteId") REFERENCES "empresas_transporte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

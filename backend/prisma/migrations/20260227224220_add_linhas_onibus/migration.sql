-- AlterTable
ALTER TABLE "passagens" ADD COLUMN     "linhaId" TEXT;

-- CreateTable
CREATE TABLE "linhas_onibus" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "empresa" TEXT,
    "origem" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "horarios" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linhas_onibus_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "passagens" ADD CONSTRAINT "passagens_linhaId_fkey" FOREIGN KEY ("linhaId") REFERENCES "linhas_onibus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

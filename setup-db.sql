-- ================================================
-- TFD System - Script de Configuracao do Banco
-- Execute este arquivo em uma ferramenta de query PostgreSQL (psql, pgAdmin, DBeaver, etc.)
-- Conectado como superuser (postgres)
-- ================================================

-- 1. Definir senha do usuario postgres
ALTER USER postgres WITH PASSWORD 'tfd@2026';

-- 2. Criar banco de dados tfd (se nao existir)
-- OBS: Execute apenas se o banco 'tfd' nao existir ainda
CREATE DATABASE tfd;

-- 3. Verificar criacao
\c tfd
SELECT current_database() AS banco_atual;

-- ================================================
-- Feito! Agora rode no terminal:
--   cd ./backend
--   npx prisma migrate dev --name init
--   npx prisma db seed
-- ================================================

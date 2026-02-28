# Script de Configuracao do Banco de Dados - TFD System
# Execute este script no PowerShell como Administrador

$PSQL = "C:\Program Files\PostgreSQL\15\bin\psql.exe"
$PSQL_USER = "postgres"
$DB_NAME = "tfd"
$NEW_PASSWORD = "tfd@2026"

Write-Host "====================================================="
Write-Host "  TFD System - Configuracao do Banco de Dados"
Write-Host "====================================================="

# Passo 1: Definir senha - tenta sem senha (trust local)
Write-Host ""
Write-Host "[1/4] Definindo senha do usuario postgres..."

$setPasswordSQL = "ALTER USER postgres WITH PASSWORD '$NEW_PASSWORD';"

$result = & $PSQL -U $PSQL_USER -h 127.0.0.1 -d postgres -c $setPasswordSQL 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Senha definida: $NEW_PASSWORD"
}
else {
    Write-Host ""
    Write-Host "ATENCAO: Nao foi possivel conectar sem senha."
    Write-Host ""
    Write-Host "Execute manualmente em uma ferramenta de query (psql, pgAdmin, etc.):"
    Write-Host ""
    Write-Host "  ALTER USER postgres WITH PASSWORD 'tfd@2026';"
    Write-Host "  CREATE DATABASE tfd;"
    Write-Host ""
    Write-Host "Depois atualize o .env e rode: npx prisma migrate dev --name init"
    Write-Host ""
    exit 1
}

# Passo 2: Criar banco tfd
Write-Host ""
Write-Host "[2/4] Criando banco de dados '$DB_NAME'..."

$env:PGPASSWORD = $NEW_PASSWORD
$createDbResult = & $PSQL -U $PSQL_USER -h localhost -d postgres -c "CREATE DATABASE $DB_NAME;" 2>&1

if ($createDbResult -match "already exists") {
    Write-Host "OK - Banco '$DB_NAME' ja existe."
}
elseif ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Banco '$DB_NAME' criado!"
}
else {
    Write-Host "Erro: $createDbResult"
}

# Passo 3: Atualizar .env
Write-Host ""
Write-Host "[3/4] Atualizando .env..."

$envPath = ".\backend\.env"
$line1 = 'DATABASE_URL="postgresql://postgres:tfd@2026@localhost:5432/tfd"'
$line2 = 'JWT_SECRET="tfd_sistema_drca_super_secret_key_2026"'
$line3 = 'JWT_EXPIRES_IN="8h"'
$line4 = 'PORT=3333'

Set-Content -Path $envPath -Value $line1 -Encoding utf8
Add-Content -Path $envPath -Value $line2 -Encoding utf8
Add-Content -Path $envPath -Value $line3 -Encoding utf8
Add-Content -Path $envPath -Value $line4 -Encoding utf8

Write-Host "OK - .env atualizado!"

# Passo 4: Testar conexao
Write-Host ""
Write-Host "[4/4] Testando conexao com o banco '$DB_NAME'..."

$env:PGPASSWORD = $NEW_PASSWORD
$testResult = & $PSQL -U $PSQL_USER -h localhost -d $DB_NAME -c "SELECT current_database();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Conexao bem-sucedida!"
}
else {
    Write-Host "Erro na conexao: $testResult"
}

Write-Host ""
Write-Host "====================================================="
Write-Host "  Configuracao concluida!"
Write-Host "  Proximo passo: rodar a migration"
Write-Host "  cd backend"
Write-Host "  npx prisma migrate dev --name init"
Write-Host "====================================================="

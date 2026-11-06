
$ErrorActionPreference = "Stop"

Write-Host "Construindo a imagem atualizada..."
docker compose build api migrate

if ($LASTEXITCODE -ne 0) {
    throw "Falha ao construir a imagem."
}

Write-Host "Aguardando o PostgreSQL..."
docker compose up -d --wait db

if ($LASTEXITCODE -ne 0) {
    throw "Falha ao iniciar o PostgreSQL."
}

Write-Host "Executando migrations..."
docker compose run --rm --no-deps migrate

if ($LASTEXITCODE -ne 0) {
    throw "Migration falhou. A API não será atualizada."
}

Write-Host "Atualizando a API..."
docker compose up -d --no-deps --force-recreate api

if ($LASTEXITCODE -ne 0) {
    throw "Falha ao iniciar a API."
}

Write-Host "Verificando containers..."
docker compose ps

Write-Host "Deploy concluído."

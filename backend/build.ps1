<#
    build.ps1 - Bootstrap de build do Protege+ (Windows)

    Objetivo: permitir compilar e executar o backend SEM exigir a instalacao
    previa do Maven. A comanda pede que o projeto funcione ao ser
    descompactado e aberto localmente - este script cumpre essa parte.

    Ordem de resolucao:
      1. Usa o Maven do PATH, se existir.
      2. Usa uma copia local ja baixada em %USERPROFILE%\.protege-maven.
      3. Baixa a distribuicao oficial do Apache e extrai (uma unica vez).

    Uso:
        .\build.ps1 clean test
        .\build.ps1 spring-boot:run
#>

$ErrorActionPreference = 'Stop'

$MavenVersao = '3.9.9'
$PastaLocal  = Join-Path $env:USERPROFILE '.protege-maven'
$PastaMaven  = Join-Path $PastaLocal "apache-maven-$MavenVersao"
$UrlMaven    = "https://archive.apache.org/dist/maven/maven-3/$MavenVersao/binaries/apache-maven-$MavenVersao-bin.zip"

function Escrever($msg, $cor = 'Cyan') { Write-Host "[Protege+] $msg" -ForegroundColor $cor }

# --- Java -------------------------------------------------------------
$java = Get-Command java -ErrorAction SilentlyContinue
if (-not $java) {
    Escrever 'JDK nao encontrado no PATH. Instale um JDK 17 ou superior.' 'Red'
    exit 1
}

# --- Maven ------------------------------------------------------------
$mvnPath = $null

$mvnNoPath = Get-Command mvn -ErrorAction SilentlyContinue
if ($mvnNoPath) {
    $mvnPath = $mvnNoPath.Source
    Escrever "Usando o Maven do PATH: $mvnPath"
}
elseif (Test-Path (Join-Path $PastaMaven 'bin\mvn.cmd')) {
    $mvnPath = Join-Path $PastaMaven 'bin\mvn.cmd'
    Escrever "Usando o Maven local: $mvnPath"
}
else {
    Escrever "Maven nao encontrado. Baixando a versao $MavenVersao (uma unica vez)..."
    New-Item -ItemType Directory -Force -Path $PastaLocal | Out-Null
    $zip = Join-Path $PastaLocal "maven-$MavenVersao.zip"

    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $UrlMaven -OutFile $zip -UseBasicParsing
    } catch {
        Escrever "Falha ao baixar o Maven: $($_.Exception.Message)" 'Red'
        Escrever 'Alternativa: instale com  winget install Apache.Maven' 'Yellow'
        exit 1
    }

    Escrever 'Extraindo...'
    Expand-Archive -Path $zip -DestinationPath $PastaLocal -Force
    Remove-Item $zip -Force

    $mvnPath = Join-Path $PastaMaven 'bin\mvn.cmd'
    if (-not (Test-Path $mvnPath)) {
        Escrever 'Extracao concluida, mas o executavel do Maven nao foi localizado.' 'Red'
        exit 1
    }
    Escrever 'Maven pronto.' 'Green'
}

# --- Atalhos ----------------------------------------------------------
# O prefixo curto 'spring-boot:run' depende da resolucao de metadados do
# plugin no repositorio, que pode falhar com NoSuchElementException.
# Usamos sempre o goal com coordenada completa, que dispensa essa etapa.
$GoalRun = 'org.springframework.boot:spring-boot-maven-plugin:run'

$argumentos = if ($args.Count -gt 0) { @($args) } else { @('clean', 'test') }
$argumentos = @($argumentos | ForEach-Object {
    if ($_ -eq 'run' -or $_ -eq 'spring-boot:run') { $GoalRun } else { $_ }
})

# --- Execucao ---------------------------------------------------------
Escrever "Executando: mvn $($argumentos -join ' ')"
Write-Host ''

& $mvnPath @argumentos
exit $LASTEXITCODE

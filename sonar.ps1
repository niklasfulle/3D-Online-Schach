param(
    [Parameter(Position = 0)]
    [string]$SonarHostUrl,

    [Parameter(Position = 1)]
    [string]$Token = "",

    [Parameter(Position = 2)]
    [string]$ProjectKey = "3D-Online-Schach"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($SonarHostUrl)) {
    throw @"
Die SonarQube-URL muss explizit übergeben werden.

Verwendung:
.\sonar.ps1 -SonarHostUrl "http://sonarqube:9000" -Token "" -ProjectKey "3D-Online-Schach"
"@
}

$parsedSonarUri = $null
$isValidSonarUri =
    [Uri]::TryCreate($SonarHostUrl, [UriKind]::Absolute, [ref]$parsedSonarUri) -and
    $parsedSonarUri.Scheme -in @("http", "https") -and
    -not [string]::IsNullOrWhiteSpace($parsedSonarUri.Host)

if (-not $isValidSonarUri) {
    throw "SonarHostUrl muss eine vollständige HTTP- oder HTTPS-URL sein."
}

$SonarHostUrl = $SonarHostUrl.TrimEnd("/")

$nodeCommand = Get-Command "node" -ErrorAction SilentlyContinue
if ($null -eq $nodeCommand) {
    throw "node wurde nicht gefunden. Installiere zuerst Node.js."
}

Write-Host "Erzeuge LCOV-Coverage-Berichte für alle Workspace-Pakete ..."
& $nodeCommand.Source (Join-Path $PSScriptRoot "scripts/run-coverage.mjs")
$coverageExitCode = $LASTEXITCODE
if ($coverageExitCode -ne 0) {
    Write-Error "Die Coverage-Tests sind mit Code $coverageExitCode fehlgeschlagen. SonarQube wurde nicht gestartet."
    exit $coverageExitCode
}

$scannerCommand = Get-Command "sonar-scanner" -ErrorAction SilentlyContinue
$dockerCommand = Get-Command "docker" -ErrorAction SilentlyContinue
$scannerArguments = @(
    "-Dsonar.host.url=$SonarHostUrl",
    "-Dsonar.projectKey=$ProjectKey"
)
$tokenValue = $Token
if ([string]::IsNullOrWhiteSpace($tokenValue)) {
    $tokenValue = $env:SONAR_TOKEN
}

Write-Host "Starte SonarQube-Analyse für '$ProjectKey' ..."
Write-Host "Server: $SonarHostUrl"

$previousSonarToken = $env:SONAR_TOKEN
try {
    if (-not [string]::IsNullOrWhiteSpace($tokenValue)) {
        $env:SONAR_TOKEN = $tokenValue
    }

    if ($null -ne $scannerCommand) {
        & $scannerCommand.Source @scannerArguments
    }
    elseif ($null -ne $dockerCommand) {
        $dockerArguments = @(
            "run",
            "--rm",
            "-v",
            "${PSScriptRoot}:/usr/src",
            "-w",
            "/usr/src"
        )
        if ($parsedSonarUri.HostNameType -eq [UriHostNameType]::Dns) {
            $resolvedAddress = [System.Net.Dns]::GetHostAddresses($parsedSonarUri.DnsSafeHost) |
                Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork } |
                Select-Object -First 1
            if ($null -ne $resolvedAddress) {
                $dockerArguments += @(
                    "--add-host",
                    "$($parsedSonarUri.DnsSafeHost):$($resolvedAddress.IPAddressToString)"
                )
            }
        }
        if (-not [string]::IsNullOrWhiteSpace($tokenValue)) {
            $dockerArguments += @("-e", "SONAR_TOKEN=$tokenValue")
        }
        $dockerArguments += @(
            "sonarsource/sonar-scanner-cli:latest",
            "-Dsonar.host.url=$SonarHostUrl",
            "-Dsonar.projectKey=$ProjectKey"
        )
        & $dockerCommand.Source @dockerArguments
    }
    else {
        throw "Weder sonar-scanner noch Docker wurde gefunden. Installiere sonar-scanner oder starte Docker Desktop."
    }

    $scannerExitCode = $LASTEXITCODE
}
finally {
    if ($null -eq $previousSonarToken) {
        Remove-Item Env:SONAR_TOKEN -ErrorAction SilentlyContinue
    }
    else {
        $env:SONAR_TOKEN = $previousSonarToken
    }
}

if ($scannerExitCode -ne 0) {
    Write-Error "Die SonarQube-Analyse ist mit Code $scannerExitCode fehlgeschlagen."
    exit $scannerExitCode
}

Write-Host "SonarQube-Analyse erfolgreich abgeschlossen."
exit 0

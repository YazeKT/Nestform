param(
  [string]$Version = "0.4.0",
  [string]$OutputDirectory = "release/0.4.0"
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$archive = Join-Path $projectRoot "vendor/boost_1_62_0.7z"
$expected = "B91C2CDA8BEE73EA613130E19E72C9589E9EF0357C4C5CC5F7523DE82CCE11F7"

if (-not (Test-Path -LiteralPath $archive)) { throw "Boost source archive is missing. Run npm run bootstrap:win first." }
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash -ne $expected) {
  throw "Boost source archive checksum does not match the approved Boost 1.62 archive."
}

$output = Join-Path $projectRoot $OutputDirectory
New-Item -ItemType Directory -Force -Path $output | Out-Null
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("nestform-source-" + [guid]::NewGuid().ToString("N"))
$sourceRoot = Join-Path $temporaryRoot "Nestform-$Version-Source"
New-Item -ItemType Directory -Force -Path $sourceRoot | Out-Null

try {
  $trackedZip = Join-Path $temporaryRoot "tracked.zip"
  git -C $projectRoot archive --format=zip --output=$trackedZip HEAD
  if ($LASTEXITCODE -ne 0) { throw "git archive failed" }
  Expand-Archive -LiteralPath $trackedZip -DestinationPath $sourceRoot
  New-Item -ItemType Directory -Force -Path (Join-Path $sourceRoot "vendor") | Out-Null
  Copy-Item -LiteralPath $archive -Destination (Join-Path $sourceRoot "vendor/boost_1_62_0.7z")
  $destination = Join-Path $output "Nestform-$Version-Source.zip"
  if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Force }
  Compress-Archive -Path $sourceRoot -DestinationPath $destination -CompressionLevel Optimal
  Write-Output $destination
}
finally {
  if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
}

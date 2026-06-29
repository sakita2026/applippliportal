param([Parameter(Mandatory=$true)][string]$SrcDir, [Parameter(Mandatory=$true)][string]$ZipPath)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$src = (Resolve-Path $SrcDir).Path.TrimEnd([char]92)
if (Test-Path -LiteralPath $ZipPath) { Remove-Item -LiteralPath $ZipPath -Force }
$fs = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::Create)
$zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
$files = Get-ChildItem -LiteralPath $src -Recurse -File
foreach ($f in $files) {
  $rel = $f.FullName.Substring($src.Length + 1).Replace([char]92, '/')
  $entry = $zip.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
  $es = $entry.Open(); $fsr = [System.IO.File]::OpenRead($f.FullName); $fsr.CopyTo($es); $fsr.Close(); $es.Close()
}
$zip.Dispose(); $fs.Close()
Write-Host ("created {0:N1} MB files={1}" -f ((Get-Item $ZipPath).Length/1MB), $files.Count)

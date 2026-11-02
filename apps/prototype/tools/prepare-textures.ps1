Add-Type -AssemblyName System.Drawing
$assetDir = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/observatory'))
$cacheDir = Join-Path $PSScriptRoot '.cache/textures'
New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
$manifest = Get-Content -LiteralPath (Join-Path $assetDir 'planet-assets.json') -Raw | ConvertFrom-Json
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
foreach ($item in $manifest) {
  $original = Join-Path $cacheDir $item.file
  if (!(Test-Path -LiteralPath $original)) { Invoke-WebRequest -Uri $item.source -OutFile $original }
  $hash = (Get-FileHash -LiteralPath $original -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($hash -ne $item.sha256) { throw "Source hash mismatch for $($item.id)" }
  $target = Join-Path $assetDir $item.displayFile
  if ($item.id -eq 'moon') { Copy-Item -LiteralPath $original -Destination $target; continue }
  $source = [System.Drawing.Image]::FromFile($original)
  $bitmap = [System.Drawing.Bitmap]::new(1024, 512)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.DrawImage($source, 0, 0, 1024, 512)
  $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
  $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]82)
  $bitmap.Save($target, $encoder, $parameters)
  $parameters.Dispose(); $graphics.Dispose(); $bitmap.Dispose(); $source.Dispose()
}
Write-Output 'Textures regenerated. Run update-manifest.mjs, then verify:data.'

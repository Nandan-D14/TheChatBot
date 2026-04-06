$envFile = Join-Path $PSScriptRoot ".dev.vars"
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and !$line.StartsWith("#")) {
    $key, $value = $line -split "=", 2
    [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), "Process")
  }
}
$remaining = $args -join " "
Invoke-Expression "npx wrangler $remaining"

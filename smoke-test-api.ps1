$base = "https://c28ub1rja2.execute-api.ap-southeast-3.amazonaws.com/prod"

Write-Host "[1] GET /api/health"
try {
  $r = Invoke-RestMethod -Uri "$base/api/health" -Method Get -TimeoutSec 30
  $r | ConvertTo-Json -Depth 5
} catch {
  if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
}

Write-Host "`n[2] GET /api/auth/outlets"
try {
  $r = Invoke-RestMethod -Uri "$base/api/auth/outlets" -Method Get -TimeoutSec 30
  if ($r.data) { Write-Host ("count=" + $r.data.Count) }
  $r | ConvertTo-Json -Depth 5
} catch {
  if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
}

Write-Host "`n[3] POST /api/admin/login (invalid creds expected)"
$body = @{ username = "admin"; password = "wrong-password" } | ConvertTo-Json
try {
  $r = Invoke-RestMethod -Uri "$base/api/admin/login" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 30
  $r | ConvertTo-Json -Depth 5
} catch {
  if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
}

Write-Host "`n[4] GET /api/sales (without token expected unauthorized)"
try {
  $r = Invoke-RestMethod -Uri "$base/api/sales" -Method Get -TimeoutSec 30
  $r | ConvertTo-Json -Depth 5
} catch {
  if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
}

Write-Host "`n[5] GET /api/expenses/categories (without token expected unauthorized or success if public)"
try {
  $r = Invoke-RestMethod -Uri "$base/api/expenses/categories" -Method Get -TimeoutSec 30
  $r | ConvertTo-Json -Depth 5
} catch {
  if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
}

# Script PowerShell para crear usuario
# Uso: .\crear-usuario.ps1

$body = @{
    correo_institucional = "htigrer@unemi.edu.ec"
    rol = "ADMINISTRADOR"
    limite_dispositivos = 5
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/crear-usuario" `
        -Method POST `
        -Headers $headers `
        -Body $body
    
    Write-Host "✅ Usuario creado exitosamente:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Error al crear usuario:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalles:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message
    }
}


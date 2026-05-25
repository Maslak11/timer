# sign-local.ps1 — Podpisywanie instalatora lokalnie przez certyfikat (mSzafir lub inny)
# Użycie: .\scripts\sign-local.ps1 -ExePath "dist\StageTimer-Setup.exe"
# Wymaga: signtool.exe (Windows SDK) i podpiętego tokenu mSzafir

param(
    [Parameter(Mandatory=$true)]
    [string]$ExePath
)

$signtool = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe"
if (-not (Test-Path $signtool)) {
    # Try to find signtool automatically
    $found = Get-ChildItem "C:\Program Files (x86)\Windows Kits" -Recurse -Filter "signtool.exe" -ErrorAction SilentlyContinue |
             Where-Object { $_.FullName -like "*x64*" } |
             Select-Object -First 1
    if ($found) { $signtool = $found.FullName }
    else {
        Write-Error "signtool.exe not found. Install Windows SDK: https://developer.microsoft.com/windows/downloads/windows-sdk/"
        exit 1
    }
}

if (-not (Test-Path $ExePath)) {
    Write-Error "File not found: $ExePath"
    exit 1
}

Write-Host "Listing available code-signing certificates..." -ForegroundColor Cyan

# Show available certificates with code signing EKU
$certs = Get-ChildItem Cert:\CurrentUser\My |
    Where-Object { $_.EnhancedKeyUsageList.ObjectId -contains "1.3.6.1.5.5.7.3.3" }

if ($certs.Count -eq 0) {
    Write-Warning "No code-signing certificates found in CurrentUser\My store."
    Write-Warning ""
    Write-Warning "mSzafir note: KIR qualified signature certificates are eIDAS document-signing"
    Write-Warning "certificates and may NOT have the Authenticode Code Signing EKU (1.3.6.1.5.5.7.3.3)."
    Write-Warning "To verify: open certmgr.msc → Personal → Certificates → check Enhanced Key Usage."
    Write-Warning ""
    Write-Warning "If no code-signing cert is available, use SignPath.io (free for open source)."
    exit 1
}

Write-Host "Available code-signing certificates:" -ForegroundColor Green
$certs | ForEach-Object { Write-Host "  Subject: $($_.Subject)" }
Write-Host ""

# Use the first available cert (auto-select), or set $thumbprint manually
# $thumbprint = "AABBCC..."  # uncomment and set manually to pick specific cert

Write-Host "Signing: $ExePath" -ForegroundColor Cyan

& $signtool sign `
    /a `
    /tr http://timestamp.sectigo.com `
    /td sha256 `
    /fd sha256 `
    /v `
    $ExePath

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Signed successfully: $ExePath" -ForegroundColor Green
    # Verify
    & $signtool verify /pa /v $ExePath
} else {
    Write-Error "Signing failed (exit code $LASTEXITCODE)"
    exit 1
}

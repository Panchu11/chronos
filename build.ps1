# Build script for CHRONOS Protocol
# Sets up environment and builds all programs

Write-Host "🚀 CHRONOS Protocol Build Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:PATH += ";$env:USERPROFILE\.cargo\bin;$env:USERPROFILE\.local\share\solana\install\active_release\bin"
$env:HOME = $env:USERPROFILE

# Check tools
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
Write-Host "Rust version: " -NoNewline
rustc --version
Write-Host "Cargo version: " -NoNewline
cargo --version
Write-Host "Solana version: " -NoNewline
solana --version
Write-Host "Anchor version: " -NoNewline
anchor --version
Write-Host ""

# Build with Anchor
Write-Host "🔨 Building programs with Anchor..." -ForegroundColor Yellow
anchor build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Generated artifacts:" -ForegroundColor Cyan
    Get-ChildItem -Path "target\deploy" -Filter "*.so" | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "📄 Generated IDLs:" -ForegroundColor Cyan
    Get-ChildItem -Path "target\idl" -Filter "*.json" | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}


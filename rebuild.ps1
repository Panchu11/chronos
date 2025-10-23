# CHRONOS Protocol - Quick Rebuild Script
# Use this script to rebuild after making code changes

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🚀 CHRONOS Protocol - Rebuild Script                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:HOME = "$env:USERPROFILE"
$env:PATH = "$env:USERPROFILE\.local\share\solana\install\releases\1.18.22\solana-release\bin;$env:PATH"
$env:CARGO_BUILD_TARGET_DIR = "C:\temp\raiku-build"

Write-Host "🔧 Environment configured" -ForegroundColor Green
Write-Host ""

# Build all programs
Write-Host "🔨 Building all programs..." -ForegroundColor Yellow
$buildStart = Get-Date

try {
    & "$env:USERPROFILE\.cargo\bin\anchor.exe" build --no-idl
    
    if ($LASTEXITCODE -eq 0) {
        $buildEnd = Get-Date
        $buildTime = ($buildEnd - $buildStart).TotalSeconds
        
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║              ✅ BUILD SUCCESSFUL! 🎉                       ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        Write-Host "⏱️  Build time: $([math]::Round($buildTime, 2)) seconds" -ForegroundColor Cyan
        Write-Host ""
        
        # Create target directories
        New-Item -ItemType Directory -Force -Path "target\deploy" | Out-Null
        
        # Copy compiled programs
        Write-Host "📦 Copying programs to target/deploy..." -ForegroundColor Yellow
        Copy-Item "C:\temp\raiku-build\deploy\*.so" "target\deploy\" -Force
        Write-Host "✅ Programs copied" -ForegroundColor Green
        Write-Host ""
        
        # Display compiled programs
        Write-Host "📁 Compiled Programs:" -ForegroundColor Cyan
        Write-Host ""
        Get-ChildItem "target\deploy\*.so" | ForEach-Object {
            $size = "{0:N2} KB" -f ($_.Length/1KB)
            Write-Host "   ✅ $($_.Name)" -ForegroundColor Green -NoNewline
            Write-Host " ($size)" -ForegroundColor Gray
        }
        Write-Host ""
        
    } else {
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Red
        Write-Host "║                ❌ BUILD FAILED                             ║" -ForegroundColor Red
        Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Red
        Write-Host ""
        exit 1
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error during build: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}


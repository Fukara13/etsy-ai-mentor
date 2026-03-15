<#
.SYNOPSIS
  Gate kapanışlarında güvenli commit / tag / push akışı için snapshot scripti.
  Operasyonel workflow utility; mimari/trunk/runtime'a dokunmaz.

.DESCRIPTION
  Gate tamamlandığında güvenli şekilde commit, tag ve push yapmak için
  adımları gösterir ve onay alarak çalıştırır. Hiçbir git komutu
  kullanıcı onayı olmadan otomatik çalıştırılmaz.

.EXAMPLE
  .\scripts\gate-snapshot.ps1
  .\scripts\gate-snapshot.ps1 -GateId "OC-7" -DryRun
#>

param(
  # Gate tanımı (örn. OC-7). Tag adı gate-<GateId> olur.
  [string] $GateId = "",
  # Sadece yapılacak komutları göster, çalıştırma.
  [switch] $DryRun,
  # Onay sormadan commit/tag/push atlama (güvenli varsayılan).
  [switch] $NoConfirm
)

$ErrorActionPreference = "Stop"

# --- 1. Ortam kontrolü ---
# Repo kökünde miyiz?
$gitRoot = git rev-parse --show-toplevel 2>$null
if (-not $gitRoot) {
  Write-Error "Bu dizin bir git repo kökü değil. Script repo kökünden çalıştırılmalı."
}
Set-Location $gitRoot

$branch = git rev-parse --abbrev-ref HEAD 2>$null
if (-not $branch) {
  Write-Error "Geçerli branch alınamadı."
}

Write-Host "`n--- Gate Snapshot ---" -ForegroundColor Cyan
Write-Host "Repo: $gitRoot"
Write-Host "Branch: $branch"

# --- 2. Durum özeti ---
$status = git status --short
if ($status) {
  Write-Host "`nBekleyen değişiklikler:" -ForegroundColor Yellow
  Write-Host $status
  Write-Host "İsterseniz önce 'git add' ve 'git commit' ile commit alın."
} else {
  Write-Host "`nÇalışan ağaç temiz." -ForegroundColor Green
}

# --- 3. Tag adı ---
if (-not $GateId) {
  $GateId = Read-Host "Gate ID girin (örn. OC-7)"
}
$GateId = $GateId.Trim()
if (-not $GateId) {
  Write-Error "Gate ID boş olamaz."
}
$tagName = "gate-$GateId"

# --- 4. Yapılacaklar özeti ---
Write-Host "`nÖnerilen adımlar:" -ForegroundColor Cyan
Write-Host "  1. (Değişiklik varsa) git add . && git commit -m `"Gate $GateId`""
Write-Host "  2. git tag -a $tagName -m `"Gate $GateId snapshot`""
Write-Host "  3. git push origin $branch && git push origin $tagName"
Write-Host ""

if ($DryRun) {
  Write-Host "DryRun: Komut çalıştırılmıyor." -ForegroundColor Gray
  exit 0
}

# --- 5. İsteğe bağlı onaylı çalıştırma ---
if (-not $NoConfirm) {
  $doIt = Read-Host "Yukarıdaki adımları kendiniz uygulayacak mısınız? (y/n)"
  if ($doIt -ne "y" -and $doIt -ne "Y") {
    Write-Host "Çıkılıyor. Komutlar yukarıda; manuel çalıştırabilirsiniz."
    exit 0
  }
}

Write-Host "`nTag oluşturmak için: git tag -a $tagName -m `"Gate $GateId snapshot`""
Write-Host "Push için: git push origin $branch && git push origin $tagName"
Write-Host "`nBitti." -ForegroundColor Green

<#
.SYNOPSIS
    Публикует статический сайт в GitHub Pages.

.DESCRIPTION
    Требует переменную окружения GH_TOKEN (fine-grained или classic PAT).
    Скрипт проверяет/создаёт репозиторий, пушит ветку и включает Pages,
    после чего возвращает адрес сайта. Токен не сохраняется в конфиг git.

.EXAMPLE
    $env:GH_TOKEN = "github_pat_..."; .\tools\deploy-pages.ps1 -Owner Boris-ZH -Repo spravochnik-bolezney
#>
param(
    [Parameter(Mandatory = $true)][string]$Owner,
    [Parameter(Mandatory = $true)][string]$Repo,
    [string]$Branch = "main",
    [switch]$SkipPush
)

$ErrorActionPreference = "Stop"

$token = $env:GH_TOKEN
if (-not $token) { throw "Переменная окружения GH_TOKEN не задана." }

$api = "https://api.github.com"
$headers = @{
    Authorization          = "Bearer $token"
    Accept                 = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent"           = "dsh-pages-deploy"
}

function Invoke-GH {
    param([string]$Method, [string]$Uri, $Body)
    $params = @{ Uri = $Uri; Headers = $headers; Method = $Method }
    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 6)
        $params.ContentType = "application/json"
    }
    Invoke-RestMethod @params
}

# ---- 1. Репозиторий -------------------------------------------------------
$repoExists = $false
try {
    $r = Invoke-GH -Method Get -Uri "$api/repos/$Owner/$Repo"
    $repoExists = $true
    Write-Host "Репозиторий найден: $($r.full_name) (private=$($r.private))"
} catch {
    Write-Host "Репозиторий не найден — создаю..."
    $r = Invoke-GH -Method Post -Uri "$api/user/repos" -Body @{
        name      = $Repo
        private   = $false
        auto_init = $false
    }
    Write-Host "Создан: $($r.full_name)"
}

# ---- 2. Push --------------------------------------------------------------
if (-not $SkipPush) {
    $remote = "https://x-access-token:$token@github.com/$Owner/$Repo.git"
    $clean = "https://github.com/$Owner/$Repo.git"
    try {
        git remote remove origin 2>$null
        git remote add origin $remote
        git push -u origin $Branch --force
        if ($LASTEXITCODE -ne 0) { throw "git push завершился с кодом $LASTEXITCODE" }
        Write-Host "Ветка $Branch отправлена."
    } finally {
        git remote set-url origin $clean 2>$null
    }
}

# ---- 3. GitHub Pages ------------------------------------------------------
$pagesUrl = "https://$Owner.github.io/$Repo/"
try {
    $p = Invoke-GH -Method Post -Uri "$api/repos/$Owner/$Repo/pages" -Body @{
        build_type = "legacy"
        source     = @{ branch = $Branch; path = "/" }
    }
    Write-Host "Pages включён: $($p.html_url)"
    $pagesUrl = $p.html_url
} catch {
    Write-Host "Не удалось включить Pages через API: $($_.Exception.Message)"
    try {
        $p = Invoke-GH -Method Get -Uri "$api/repos/$Owner/$Repo/pages"
        Write-Host "Pages уже настроен: $($p.html_url)"
        $pagesUrl = $p.html_url
    } catch {
        Write-Host "Включите Pages вручную: Settings → Pages → Deploy from a branch → $Branch / (root)."
    }
}

Write-Host ""
Write-Host "Сайт: $pagesUrl"
Write-Host "Первый билд обычно занимает 1–2 минуты."

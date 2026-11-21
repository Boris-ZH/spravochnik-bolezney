<#
.SYNOPSIS
    Publish this static site to GitHub Pages.

.DESCRIPTION
    Requires the GH_TOKEN environment variable (fine-grained or classic PAT).
    The script checks the repository, pushes the branch, enables Pages and
    prints the site URL. The token is never persisted in git config.

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
if (-not $token) { throw "GH_TOKEN environment variable is not set." }

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

# ---- 1. Repository --------------------------------------------------------
try {
    $r = Invoke-GH -Method Get -Uri "$api/repos/$Owner/$Repo"
    Write-Host "Repository found: $($r.full_name) (private=$($r.private))"
} catch {
    Write-Host "Repository not found - creating..."
    $r = Invoke-GH -Method Post -Uri "$api/user/repos" -Body @{
        name      = $Repo
        private   = $false
        auto_init = $false
    }
    Write-Host "Created: $($r.full_name)"
}

# ---- 2. Push --------------------------------------------------------------
if (-not $SkipPush) {
    $remote = "https://x-access-token:$token@github.com/$Owner/$Repo.git"
    $clean = "https://github.com/$Owner/$Repo.git"
    $env:GIT_TERMINAL_PROMPT = "0"
    $savedEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $remotes = @(git remote)
        if ($remotes -contains "origin") { git remote remove origin | Out-Null }
        git remote add origin $remote
        if ($LASTEXITCODE -ne 0) { throw "git remote add failed" }
        git push -u origin $Branch --force
        if ($LASTEXITCODE -ne 0) { throw "git push exited with code $LASTEXITCODE" }
        Write-Host "Branch $Branch pushed."
    } finally {
        git remote set-url origin $clean | Out-Null
        $ErrorActionPreference = $savedEap
    }
}

# ---- 3. GitHub Pages ------------------------------------------------------
$pagesUrl = "https://$Owner.github.io/$Repo/"
try {
    $p = Invoke-GH -Method Post -Uri "$api/repos/$Owner/$Repo/pages" -Body @{
        build_type = "legacy"
        source     = @{ branch = $Branch; path = "/" }
    }
    Write-Host "Pages enabled: $($p.html_url)"
    $pagesUrl = $p.html_url
} catch {
    Write-Host "Pages API failed: $($_.Exception.Message)"
    try {
        $p = Invoke-GH -Method Get -Uri "$api/repos/$Owner/$Repo/pages"
        Write-Host "Pages already configured: $($p.html_url)"
        $pagesUrl = $p.html_url
    } catch {
        Write-Host "Enable Pages manually: Settings -> Pages -> Deploy from a branch -> $Branch / (root)."
    }
}

Write-Host ""
Write-Host "Site: $pagesUrl"
Write-Host "The first build usually takes 1-2 minutes."

# Add the site's current build web files to the Dataverse solution after upload-code-site.
# upload-code-site creates new web file records (hashed bundle names) but never adds them to a
# solution, so the Power Platform pipeline would keep shipping the old bundles to TEST/PROD.
# (npm run deploy runs this right after `pac pages upload-code-site`.)
#
# Only ADDS components. Stale bundles still in the solution are reported; pass -PruneStale to
# remove them from the solution (records are not deleted).
#
# Requires: az CLI signed in to the tenant (`az login`).

param(
    [string]$EnvUrl = "https://vmbso-customerportal-dev.crm4.dynamics.com",
    [string]$SolutionUniqueName = "CustomerPortalPowerPages",
    [string]$WebsiteId = "ac923a79-af52-4a68-8d8f-9f947a0d5821",
    [string]$BuildPath = "build",
    [switch]$DryRun,
    [switch]$PruneStale
)

$ErrorActionPreference = "Stop"
$api = "$EnvUrl/api/data/v9.2"

if (-not (Test-Path $BuildPath)) {
    Write-Host "ERROR: build folder not found at: $BuildPath" -ForegroundColor Red
    exit 1
}

$token = az account get-access-token --resource $EnvUrl --query accessToken -o tsv
if ($LASTEXITCODE -ne 0 -or -not $token) {
    Write-Host "ERROR: could not get a token for $EnvUrl. Run 'az login' first." -ForegroundColor Red
    exit 1
}
$headers = @{
    Authorization      = "Bearer $token"
    Accept             = "application/json"
    "OData-Version"    = "4.0"
    "OData-MaxVersion" = "4.0"
}

function Get-All([string]$url) {
    $items = @()
    while ($url) {
        $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        $items += $res.value
        $url = $res.'@odata.nextLink'
    }
    return $items
}

# Component type of powerpagecomponent differs per environment, so look it up
$componentType = (Get-All "$api/solutioncomponentdefinitions?`$select=solutioncomponenttype&`$filter=primaryentityname eq 'powerpagecomponent'")[0].solutioncomponenttype
$solution = (Get-All "$api/solutions?`$select=solutionid&`$filter=uniquename eq '$SolutionUniqueName'")[0]
if (-not $componentType -or -not $solution) {
    Write-Host "ERROR: solution '$SolutionUniqueName' or powerpagecomponent definition not found in $EnvUrl" -ForegroundColor Red
    exit 1
}

# Web files (powerpagecomponenttype 3) of this site
$webFiles = Get-All "$api/powerpagecomponents?`$select=name,powerpagecomponentid,content&`$filter=_powerpagesiteid_value eq $WebsiteId and powerpagecomponenttype eq 3"
$inSolution = @{}
Get-All "$api/solutioncomponents?`$select=objectid&`$filter=_solutionid_value eq $($solution.solutionid) and componenttype eq $componentType" |
    ForEach-Object { $inSolution[$_.objectid] = $true }

# Hashtables are case-insensitive, matching how Power Pages resolves file names
$buildFiles = @{}
Get-ChildItem -Path $BuildPath -Recurse -File | ForEach-Object { $buildFiles[$_.Name] = $true }

function Get-PartialUrl($wf) {
    try { return ($wf.content | ConvertFrom-Json).partialurl } catch { return $null }
}

# Records without a partial URL (e.g. duplicate index.html) can't be served, so never ship them
$current = $webFiles | Where-Object { $buildFiles.ContainsKey($_.name) -and (Get-PartialUrl $_) }
$toAdd = $current | Where-Object { -not $inSolution.ContainsKey($_.powerpagecomponentid) }

$missing = $buildFiles.Keys | Where-Object { $n = $_; -not ($current | Where-Object { $_.name -eq $n }) }
foreach ($name in $missing) {
    Write-Host "WARNING: $name is in $BuildPath but has no served web file in Dataverse (was it uploaded?)" -ForegroundColor Yellow
}

# Stale = in the solution, not part of this build, and either unservable or a hashed bundle
$currentIds = @{}
$current | ForEach-Object { $currentIds[$_.powerpagecomponentid] = $true }
$stale = $webFiles | Where-Object {
    $inSolution.ContainsKey($_.powerpagecomponentid) -and -not $currentIds.ContainsKey($_.powerpagecomponentid) -and
    (-not (Get-PartialUrl $_) -or $_.name -match "\.[A-Za-z0-9_-]{8,}(\.chunk)?\.(js|css|woff2?)$")
}

Write-Host "`nSolution: $SolutionUniqueName ($EnvUrl)" -ForegroundColor Cyan
Write-Host "Current build web files: $(@($current).Count), already in solution: $(@($current).Count - @($toAdd).Count)" -ForegroundColor Cyan

foreach ($wf in $toAdd) {
    if ($DryRun) {
        Write-Host "  [dry run] would add: $($wf.name) ($($wf.powerpagecomponentid))" -ForegroundColor Yellow
        continue
    }
    $body = @{
        ComponentId           = $wf.powerpagecomponentid
        ComponentType         = $componentType
        SolutionUniqueName    = $SolutionUniqueName
        AddRequiredComponents = $false
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$api/AddSolutionComponent" -Headers $headers -Method Post -Body $body -ContentType "application/json" | Out-Null
    Write-Host "  added: $($wf.name) ($($wf.powerpagecomponentid))" -ForegroundColor Green
}

if (@($stale).Count -gt 0) {
    $action = if ($PruneStale -and -not $DryRun) { "removing from solution" } else { "stale, run with -PruneStale to remove from solution" }
    Write-Host "`nStale web files in solution ($action):" -ForegroundColor Yellow
    foreach ($wf in $stale) {
        if ($PruneStale -and -not $DryRun) {
            $body = @{
                SolutionComponent  = @{
                    "@odata.type"       = "Microsoft.Dynamics.CRM.solutioncomponent"
                    # Web API maps this to the component's own id, not the solutioncomponent row id
                    solutioncomponentid = $wf.powerpagecomponentid
                }
                ComponentType      = $componentType
                SolutionUniqueName = $SolutionUniqueName
            } | ConvertTo-Json
            Invoke-RestMethod -Uri "$api/RemoveSolutionComponent" -Headers $headers -Method Post -Body $body -ContentType "application/json" | Out-Null
        }
        Write-Host "  $($wf.name) ($($wf.powerpagecomponentid))" -ForegroundColor Yellow
    }
}

Write-Host "`nDone." -ForegroundColor Green

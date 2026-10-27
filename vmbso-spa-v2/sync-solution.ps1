# Add the site's current build web files and shared site settings to the Dataverse solution after
# upload-code-site. upload-code-site creates new web file records (hashed bundle names) and site
# settings but never adds them to a solution, so the Power Platform pipeline would keep shipping the
# old bundles to TEST/PROD and never update those settings there.
# (npm run deploy runs this right after `pac pages upload-code-site`.)
#
# Site settings added: names matching -SiteSettingPatterns (same value in every environment) plus
# settings backed by an environment variable (value comes from each environment).
#
# Only ADDS components. Stale bundles still in the solution are reported; pass -PruneStale to
# remove them from the solution (records are not deleted). Site settings are never removed.
#
# Requires: az CLI signed in to the tenant (`az login`).

param(
    [string]$EnvUrl = "https://vmbso-customerportal-dev.crm4.dynamics.com",
    [string]$SolutionUniqueName = "CustomerPortalPowerPages",
    [string]$WebsiteId = "ac923a79-af52-4a68-8d8f-9f947a0d5821",
    [string]$BuildPath = "build",
    [string]$SiteSettingsPath = ".powerpages-site/site-settings",
    [string[]]$SiteSettingPatterns = @("HTTP/*", "Webapi/*"),
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

# Site settings (powerpagecomponenttype 9) that belong in the solution
$siteSettings = Get-All "$api/powerpagecomponents?`$select=name,powerpagecomponentid,content&`$filter=_powerpagesiteid_value eq $WebsiteId and powerpagecomponenttype eq 9"
$shared = $siteSettings | Where-Object {
    $s = $_
    $envVar = try { ($s.content | ConvertFrom-Json).envvar_schema } catch { $null }
    $envVar -or ($SiteSettingPatterns | Where-Object { $s.name -like $_ })
}
$settingsToAdd = $shared | Where-Object { -not $inSolution.ContainsKey($_.powerpagecomponentid) }

# A matching setting in the repo but not in Dataverse was deleted there (e.g. reset in the admin UI)
if (Test-Path $SiteSettingsPath) {
    $settingIds = @{}
    $siteSettings | ForEach-Object { $settingIds[$_.powerpagecomponentid] = $true }
    foreach ($file in Get-ChildItem -Path $SiteSettingsPath -Filter *.yml) {
        $yml = Get-Content $file.FullName -Raw
        $id = if ($yml -match "(?m)^id:\s*(\S+)") { $matches[1] }
        $name = if ($yml -match "(?m)^name:\s*(.+?)\s*$") { $matches[1] }
        $wanted = ($yml -match "(?m)^envvar_schema:") -or ($SiteSettingPatterns | Where-Object { $name -like $_ })
        if ($wanted -and $id -and -not $settingIds.ContainsKey($id)) {
            Write-Host "WARNING: site setting $name ($id) is in the repo but missing in Dataverse; re-upload before running the pipeline" -ForegroundColor Yellow
        }
    }
}

Write-Host "`nSolution: $SolutionUniqueName ($EnvUrl)" -ForegroundColor Cyan
Write-Host "Current build web files: $(@($current).Count), already in solution: $(@($current).Count - @($toAdd).Count)" -ForegroundColor Cyan
Write-Host "Shared site settings: $(@($shared).Count), already in solution: $(@($shared).Count - @($settingsToAdd).Count)" -ForegroundColor Cyan

foreach ($component in @($toAdd) + @($settingsToAdd)) {
    if (-not $component) { continue }
    if ($DryRun) {
        Write-Host "  [dry run] would add: $($component.name) ($($component.powerpagecomponentid))" -ForegroundColor Yellow
        continue
    }
    $body = @{
        ComponentId           = $component.powerpagecomponentid
        ComponentType         = $componentType
        SolutionUniqueName    = $SolutionUniqueName
        AddRequiredComponents = $false
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$api/AddSolutionComponent" -Headers $headers -Method Post -Body $body -ContentType "application/json" | Out-Null
    Write-Host "  added: $($component.name) ($($component.powerpagecomponentid))" -ForegroundColor Green
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

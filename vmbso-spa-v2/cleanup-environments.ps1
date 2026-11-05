# Finds and fixes leftovers of the v2 site in DEV and TEST that break pipeline deployments.
# Dry run by default: lists every change and writes a plan CSV. Pass -Apply to execute.
# A dry run with 0 steps means the environments are clean, so it doubles as a health check.
#
# DEV
#   delete  inactive empty EntraExternalID_1/_2 site settings, bot consumers (the SPA uses no bot),
#           records with no site and no type (failed uploads), and any ids passed in -ExtraDeleteIds
#   delete  the matching local .powerpages-site YAML so the next upload-code-site doesn't recreate them
#   add     live auth site settings (EntraExternalID_3/*, BearerAuthentication/*) to the site solution
#           (-IncludePermissionsAndFlows also adds the site's table permissions and cloud flow registrations)
# TEST
#   delete  unmanaged components that don't exist in DEV (leftovers of direct uploads, e.g. old bundles)
#   remove  the unmanaged Active layer on managed components so the pipeline's managed layer wins
#           (a direct `pac pages upload` to TEST creates these; never upload to TEST)
#
# Usage: run with -Scope DEV,REPO first, then the pipeline, then -Scope TEST.
# Requires: az CLI signed in to the tenant (`az login`).

param(
    [string]$DevUrl = "https://vmbso-customerportal-dev.crm4.dynamics.com",
    [string]$TestUrl = "https://vmbso-customerportal-test.crm4.dynamics.com",
    [string]$SolutionUniqueName = "CustomerPortalPowerPages",
    [string]$WebsiteId = "ac923a79-af52-4a68-8d8f-9f947a0d5821",
    [string]$SitePath = "$PSScriptRoot\.powerpages-site",
    [string]$PlanPath = "$env:TEMP\cleanup-environments-plan.csv",
    [string[]]$ExtraDeleteIds = @(),
    [ValidateSet("DEV", "REPO", "TEST")]
    [string[]]$Scope = @("DEV", "REPO", "TEST"),
    [switch]$IncludePermissionsAndFlows,
    [switch]$Apply
)

$ErrorActionPreference = "Stop"
$TypeWebFile = 3; $TypeSiteSetting = 9; $TypeTablePermission = 18; $TypeBotConsumer = 27; $TypeCloudFlow = 33

function Connect-Env([string]$url) {
    $token = az account get-access-token --resource $url --query accessToken -o tsv
    if ($LASTEXITCODE -ne 0 -or -not $token) { throw "could not get a token for $url. Run 'az login' first." }
    return @{
        Api     = "$url/api/data/v9.2"
        Headers = @{ Authorization = "Bearer $token"; Accept = "application/json"; "OData-Version" = "4.0"; "OData-MaxVersion" = "4.0" }
    }
}

function Get-All($env, [string]$path) {
    $items = @(); $url = "$($env.Api)/$path"
    while ($url) {
        $res = Invoke-RestMethod -Uri $url -Headers $env.Headers -Method Get
        $items += $res.value
        $url = $res.'@odata.nextLink'
    }
    return $items
}

function Get-Value($c) { try { return [string]($c.content | ConvertFrom-Json).value } catch { return "" } }
function Get-PartialUrl($c) { try { return ($c.content | ConvertFrom-Json).partialurl } catch { return $null } }

$plan = New-Object System.Collections.Generic.List[object]
function Add-Step([string]$envName, [string]$action, $c, [string]$reason, [scriptblock]$run) {
    $plan.Add([pscustomobject]@{
        Env = $envName; Action = $action; Type = $c.'powerpagecomponenttype@OData.Community.Display.V1.FormattedValue'
        Name = $c.name; Id = $c.powerpagecomponentid; Reason = $reason; Run = $run
    })
}

# The delete plugin throws a null reference on records with no site and no type, so attach them first
function Remove-Component($env, [string]$id, [bool]$orphan) {
    if ($orphan) {
        $body = @{ "powerpagesiteid@odata.bind" = "/powerpagesites($WebsiteId)"; powerpagecomponenttype = $TypeSiteSetting; name = "orphan-cleanup" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$($env.Api)/powerpagecomponents($id)" -Headers $env.Headers -Method Patch -Body $body -ContentType "application/json" | Out-Null
    }
    Invoke-RestMethod -Uri "$($env.Api)/powerpagecomponents($id)" -Headers $env.Headers -Method Delete | Out-Null
}

$select = "`$select=name,powerpagecomponentid,powerpagecomponenttype,ismanaged,statecode,content,_powerpagesiteid_value"
$annotated = @{ Prefer = 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"' }

# ---------------- DEV ----------------
$dev = Connect-Env $DevUrl
$dev.Headers += $annotated
$devAll = Get-All $dev "powerpagecomponents?$select"
$devSite = $devAll | Where-Object { $_._powerpagesiteid_value -eq $WebsiteId }
$devType = (Get-All $dev "solutioncomponentdefinitions?`$select=solutioncomponenttype&`$filter=primaryentityname eq 'powerpagecomponent'")[0].solutioncomponenttype
$solution = (Get-All $dev "solutions?`$select=solutionid&`$filter=uniquename eq '$SolutionUniqueName'")[0]
$inSolution = @{}
Get-All $dev "solutioncomponents?`$select=objectid&`$filter=_solutionid_value eq $($solution.solutionid) and componenttype eq $devType" |
    ForEach-Object { $inSolution[$_.objectid] = $true }

$deleteIds = @{}
$devDeletes = @(
    $devSite | Where-Object {
        $_.powerpagecomponenttype -eq $TypeSiteSetting -and $_.name -match "^Authentication/OpenIdConnect/EntraExternalID_[12]/" -and
        $_.statecode -eq 1 -and -not (Get-Value $_)
    } | ForEach-Object { @{ c = $_; r = "inactive, empty, unused provider (only EntraExternalID_3 is live)" } }
    $devSite | Where-Object { $_.powerpagecomponenttype -eq $TypeBotConsumer } |
        ForEach-Object { @{ c = $_; r = "SPA uses no bot; botschemaname $((($_.content | ConvertFrom-Json).botschemaname))" } }
    $devSite | Where-Object { $ExtraDeleteIds -contains $_.powerpagecomponentid } |
        ForEach-Object { @{ c = $_; r = "listed in -ExtraDeleteIds" } }
    $devAll | Where-Object { -not $_._powerpagesiteid_value -and -not $_.powerpagecomponenttype } |
        ForEach-Object { @{ c = $_; r = "orphan: no site, no type (failed upload or old build file)" } }
)
foreach ($d in $devDeletes) {
    $c = $d.c; $deleteIds[$c.powerpagecomponentid] = $true
    $reason = $d.r + $(if ($inSolution.ContainsKey($c.powerpagecomponentid)) { "; in solution, removed from TEST on next pipeline upgrade" } else { "" })
    $id = $c.powerpagecomponentid
    $orphan = -not $c._powerpagesiteid_value
    Add-Step "DEV" "delete record" $c $reason { Remove-Component $dev $id $orphan }.GetNewClosure()
}

# Local YAML that would recreate the deleted records on the next upload-code-site
if (Test-Path $SitePath) {
    $siteRoot = (Resolve-Path $SitePath).Path
    Get-ChildItem -Path $siteRoot -Recurse -Filter *.yml | Where-Object { $_.FullName -notmatch "\\\.portalconfig\\|manifest\.yml$" } | ForEach-Object {
        $file = $_
        $id = if ((Get-Content $file.FullName -Raw) -match "(?m)^id:\s*(\S+)") { $matches[1] }
        if ($id -and $deleteIds.ContainsKey($id)) {
            $path = $file.FullName
            $plan.Add([pscustomobject]@{ Env = "REPO"; Action = "delete file"; Type = "yml"; Name = $file.FullName.Substring($siteRoot.Length + 1); Id = $id
                Reason = "would recreate deleted record on upload"; Run = { Remove-Item -LiteralPath $path }.GetNewClosure() })
        }
    }
}

$addFilter = {
    $_.statecode -eq 0 -and -not $inSolution.ContainsKey($_.powerpagecomponentid) -and -not $deleteIds.ContainsKey($_.powerpagecomponentid) -and (
        ($_.powerpagecomponenttype -eq $TypeSiteSetting -and $_.name -match "^Authentication/(OpenIdConnect/EntraExternalID_3|BearerAuthentication)/") -or
        ($IncludePermissionsAndFlows -and $_.powerpagecomponenttype -in @($TypeTablePermission, $TypeCloudFlow)))
}
foreach ($c in $devSite | Where-Object $addFilter) {
    $id = $c.powerpagecomponentid
    $reason = if ($c.powerpagecomponenttype -eq $TypeSiteSetting) { "live auth setting, only reaches TEST by direct upload today" } else { "site component in no solution" }
    Add-Step "DEV" "add to $SolutionUniqueName" $c $reason {
        $body = @{ ComponentId = $id; ComponentType = $devType; SolutionUniqueName = $SolutionUniqueName; AddRequiredComponents = $false } | ConvertTo-Json
        Invoke-RestMethod -Uri "$($dev.Api)/AddSolutionComponent" -Headers $dev.Headers -Method Post -Body $body -ContentType "application/json" | Out-Null
    }.GetNewClosure()
}

# ---------------- TEST ----------------
if ($Scope -contains "TEST") {
    $test = Connect-Env $TestUrl
    $test.Headers += $annotated
    $testAll = Get-All $test "powerpagecomponents?$select"
    $testSite = $testAll | Where-Object { $_._powerpagesiteid_value -eq $WebsiteId }
    $devIds = @{}; $devAll | ForEach-Object { $devIds[$_.powerpagecomponentid] = $true }

    # Unmanaged and absent from DEV (TEST-only leftovers, or deleted in DEV), on this site or on no site
    $testDeletes = $testAll | Where-Object {
        -not $_.ismanaged -and -not $devIds.ContainsKey($_.powerpagecomponentid) -and
        ($_._powerpagesiteid_value -eq $WebsiteId -or -not $_._powerpagesiteid_value)
    }
    foreach ($c in $testDeletes) {
        $reason = if ($c.powerpagecomponenttype -ne $TypeWebFile) { "unmanaged, not in DEV" }
                  elseif (Get-PartialUrl $c) { "stale bundle still served, not in DEV" }
                  else { "no partial URL (unservable), not in DEV" }
        $id = $c.powerpagecomponentid
        $orphan = -not $c._powerpagesiteid_value
        Add-Step "TEST" "delete record" $c $reason { Remove-Component $test $id $orphan }.GetNewClosure()
    }

    Write-Host "Checking solution layers of $(@($testSite | Where-Object ismanaged).Count) managed TEST components..." -ForegroundColor Cyan
    foreach ($c in $testSite | Where-Object ismanaged) {
        $id = $c.powerpagecomponentid
        $layers = Get-All $test "msdyn_componentlayers?`$select=msdyn_solutionname&`$filter=(msdyn_componentid eq '$id' and msdyn_solutioncomponentname eq 'powerpagecomponent')"
        if ($layers | Where-Object { $_.msdyn_solutionname -eq "Active" }) {
            Add-Step "TEST" "remove Active layer" $c "unmanaged layer masks pipeline updates" {
                Invoke-RestMethod -Uri "$($test.Api)/RemoveActiveCustomizations(SolutionComponentName='powerpagecomponent',ComponentId=$id)" -Headers $test.Headers -Method Get | Out-Null
            }.GetNewClosure()
        }
    }
}

# ---------------- Report / apply ----------------
$plan = @($plan | Where-Object { $Scope -contains $_.Env })
$plan | Select-Object Env, Action, Type, Name, Id, Reason | Export-Csv -Path $PlanPath -NoTypeInformation -Encoding UTF8
Write-Host "`nPlan ($($plan.Count) steps) written to $PlanPath" -ForegroundColor Cyan
$plan | Group-Object Env, Action, Type | Sort-Object Name | ForEach-Object { Write-Host ("  {0,4}  {1}" -f $_.Count, $_.Name) }

$otherSites = if ($test) { Get-All $test "powerpagesites?`$select=name,powerpagesiteid&`$filter=powerpagesiteid ne $WebsiteId" }
foreach ($s in $otherSites) {
    Write-Host "`nNOT handled: other site in TEST '$($s.name)' ($($s.powerpagesiteid)). Check it has no URL in the admin center, then delete it from Power Pages." -ForegroundColor Yellow
}

if (-not $Apply) { Write-Host "`nDry run, nothing changed. Re-run with -Apply to execute." -ForegroundColor Yellow; exit 0 }

$failed = 0
foreach ($step in $plan) {
    try { & $step.Run; Write-Host "  done: $($step.Env) $($step.Action) $($step.Name)" -ForegroundColor Green }
    catch { $failed++; Write-Host "  FAILED: $($step.Env) $($step.Action) $($step.Name) ($($step.Id)): $($_.Exception.Message)" -ForegroundColor Red }
}
Write-Host "`nDone, $failed failed." -ForegroundColor $(if ($failed) { "Red" } else { "Green" })

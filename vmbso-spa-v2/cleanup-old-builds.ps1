# Clean up old build artifacts from web-files directory
# Keeps only the files matching the hashes of the freshly-built Vite output in ./build
# (npm run deploy always runs `npm run build` immediately before this script).

$webFilesPaths = @(
    ".powerpages-site\web-files"
)

$buildPath = "build"
$totalDeleted = 0

if (-not (Test-Path $buildPath)) {
    Write-Host "WARNING: build folder not found at: $buildPath" -ForegroundColor Yellow
    Write-Host "Run 'npm run build' before 'npm run cleanup' so current hashes can be determined." -ForegroundColor Yellow
    exit 0
}

# Determine current hashes directly from the freshly-built output, since Vite/Rollup
# hashes are mixed-case + digits + '_'/'-' (e.g. main.Bz9X80SW.js) and there is no
# asset-manifest.json to parse (that was a CRA/webpack artifact).
$currentHashes = @()
$buildAssets = Get-ChildItem -Path "$buildPath\static\js", "$buildPath\static\css" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "main\.([A-Za-z0-9_-]+)\.(js|css)" }

foreach ($file in $buildAssets) {
    if ($file.Name -match "main\.([A-Za-z0-9_-]+)\.(js|css)") {
        $currentHashes += $matches[1]
    }
}

$currentHashes = $currentHashes | Select-Object -Unique

if ($currentHashes.Count -eq 0) {
    Write-Host "WARNING: no main.*.js/css files found under $buildPath\static" -ForegroundColor Yellow
    Write-Host "Run 'npm run build' before 'npm run cleanup' so current hashes can be determined." -ForegroundColor Yellow
    exit 0
}

Write-Host "`nCurrent build hashes to KEEP:" -ForegroundColor Green
$currentHashes | ForEach-Object { Write-Host "  main.$_.*" -ForegroundColor Green }

foreach ($webFilesPath in $webFilesPaths) {
    if (-not (Test-Path $webFilesPath)) {
        Write-Host "Skipping: $webFilesPath (not found)" -ForegroundColor DarkGray
        continue
    }

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Cleaning: $webFilesPath" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    # Find all main.* directories in web-files
    $allMainFiles = Get-ChildItem -Path $webFilesPath -Directory |
        Where-Object { $_.Name -match "^main\.([A-Za-z0-9_-]+)\." }

    Write-Host "`nTotal main.* files found: $($allMainFiles.Count)" -ForegroundColor Cyan

    # Determine which files to delete
    $toDelete = @()
    foreach ($dir in $allMainFiles) {
        $filename = $dir.Name
        # Extract hash from filename
        if ($filename -match "^main\.([A-Za-z0-9_-]+)\.") {
            $fileHash = $matches[1]
            if ($currentHashes -notcontains $fileHash) {
                $toDelete += $dir
            }
        }
    }

    if ($toDelete.Count -eq 0) {
        Write-Host "No old files to clean up in this location." -ForegroundColor Green
        continue
    }

    Write-Host "`nOLD files to DELETE ($($toDelete.Count)):" -ForegroundColor Yellow
    $toDelete | Select-Object -First 5 | ForEach-Object { Write-Host "  $($_.Name)" -ForegroundColor DarkGray }
    if ($toDelete.Count -gt 5) {
        Write-Host "  ... and $($toDelete.Count - 5) more" -ForegroundColor DarkGray
    }

    # Delete old files (auto-confirm since we know what we're doing)
    Write-Host "`nDeleting old files..." -ForegroundColor Cyan
    $deletedCount = 0
    foreach ($dir in $toDelete) {
        try {
            Remove-Item -Path $dir.FullName -Recurse -Force
            $deletedCount++
        } catch {
            Write-Host "  ERROR deleting $($dir.Name): $_" -ForegroundColor Red
        }
    }

    Write-Host "Deleted $deletedCount files from this location." -ForegroundColor Green
    $totalDeleted += $deletedCount
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Cleanup complete! Total deleted: $totalDeleted files." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

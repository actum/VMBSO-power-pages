# Clean up old build artifacts from web-files directory
# Keeps only the files referenced in asset-manifest.json

$webFilesPaths = @(
    ".powerpages-site\web-files"
)

$totalDeleted = 0

foreach ($webFilesPath in $webFilesPaths) {
    if (-not (Test-Path $webFilesPath)) {
        Write-Host "Skipping: $webFilesPath (not found)" -ForegroundColor DarkGray
        continue
    }

    $manifestPath = "$webFilesPath\asset-manifest.json\asset-manifest.json"
    
    if (-not (Test-Path $manifestPath)) {
        Write-Host "WARNING: asset-manifest.json not found at: $manifestPath" -ForegroundColor Yellow
        continue
    }

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Cleaning: $webFilesPath" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    # Read the manifest to find current files
    $manifest = Get-Content $manifestPath | ConvertFrom-Json
    $currentHashes = @()

    # Extract current file hashes from the manifest
    foreach ($file in $manifest.files.PSObject.Properties.Value) {
        if ($file -match "main\.([a-f0-9]+)\.(js|css)") {
            $hash = $matches[1]
            $currentHashes += $hash
        }
    }

    $currentHashes = $currentHashes | Select-Object -Unique

    Write-Host "`nCurrent build hashes to KEEP:" -ForegroundColor Green
    $currentHashes | ForEach-Object { Write-Host "  main.$_.*" -ForegroundColor Green }

    # Find all main.* directories in web-files
    $allMainFiles = Get-ChildItem -Path $webFilesPath -Directory | 
        Where-Object { $_.Name -match "^main\.([a-f0-9]+)\." }

    Write-Host "`nTotal main.* files found: $($allMainFiles.Count)" -ForegroundColor Cyan

    # Determine which files to delete
    $toDelete = @()
    foreach ($dir in $allMainFiles) {
        $filename = $dir.Name
        # Extract hash from filename
        if ($filename -match "main\.([a-f0-9]+)\.") {
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
Write-Host "Cleanup complete! Total deleted: $totalDeleted files." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

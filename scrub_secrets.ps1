Write-Host "WARNING: This script will remove secrets from your git history." -ForegroundColor Red
Write-Host "You should have a backup before proceeding." -ForegroundColor Yellow
Write-Host "Waiting 5 seconds... Press Ctrl+C to cancel." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Files to scrub from history
$filesToRemove = @(
  "backend/.env",
  "mobile/.env",
  "backend/firebase-service-account.json",
  "mobile/google-services.json",
  "mobile/GoogleService-Info.plist",
  "backend/src/config/firebase-service-account.json"
)

# Construct arguments
$gitArgs = @("filter-repo", "--invert-paths", "--force")

foreach ($file in $filesToRemove) {
    $gitArgs += "--path"
    $gitArgs += $file
}

Write-Host "Running git filter-repo..." -ForegroundColor Green

# Check if git-filter-repo is available
try {
    git filter-repo --version | Out-Null
} catch {
    Write-Host "Error: 'git-filter-repo' is not found." -ForegroundColor Red
    Write-Host "Please install it first using Python:" -ForegroundColor Yellow
    Write-Host "pip install git-filter-repo" -ForegroundColor White
    exit 1
}

# Execute git command
& git $gitArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "Secrets removed from history." -ForegroundColor Green
    Write-Host "You must now force push to your remote repository:" -ForegroundColor Yellow
    Write-Host "git push origin --force --all"
    Write-Host "git push origin --force --tags"
} else {
    Write-Host "Command failed. Please ensure you are in the root of the repository and git-filter-repo is installed." -ForegroundColor Red
}

# Permanent Fix: Download and Install the Missing Android Platform Tools

$SdkPath = "C:\Users\thesh\AppData\Local\Android\Sdk"
$ZipPath = "$SdkPath\platform-tools.zip"
$Url = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip"

# 1. Ensure SDK directory exists
if (-not (Test-Path $SdkPath)) {
    Write-Host "Creating SDK directory..."
    New-Item -ItemType Directory -Force -Path $SdkPath | Out-Null
}

# 2. Download the tools
Write-Host "Downloading Android Platform Tools (adb)..."
Invoke-WebRequest -Uri $Url -OutFile $ZipPath

# 3. Extract
Write-Host "Extracting files..."
Expand-Archive -Path $ZipPath -DestinationPath $SdkPath -Force

# 4. Cleanup
Remove-Item $ZipPath

# 5. Verify
$AdbPath = "$SdkPath\platform-tools\adb.exe"
if (Test-Path $AdbPath) {
    Write-Host "SUCCESS: adb.exe installed at $AdbPath"
    Write-Host "You can now run 'npx expo start' without errors."
} else {
    Write-Error "FAILED: Something went wrong extracting the files."
}

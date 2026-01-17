
# Force remove Android env vars for this session
$env:ANDROID_HOME = ""
$env:ANDROID_SDK_ROOT = ""
$env:Path = $env:Path -replace "C:\\Users\\thesh\\AppData\\Local\\Android\\Sdk\\platform-tools", ""

Write-Host "Starting Expo with FORCE cleaned environment..."
# Run without npx to avoid spawning new shell that inherits bad vars? No, npx is needed.
# Try setting a dummy variable to force a refresh
$env:EXPO_NO_ANDROID_CHECK = "1"

npx expo start --tunnel --clear

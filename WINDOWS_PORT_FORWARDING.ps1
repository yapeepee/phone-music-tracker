# Windows Port Forwarding Setup for WSL2
# Run this in PowerShell as Administrator

Write-Host "Setting up port forwarding for Music Tracker..." -ForegroundColor Green

# Forward Backend API port
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=172.26.153.150
Write-Host "✓ Backend API port 8000 forwarded" -ForegroundColor Green

# Forward Expo Metro Bundler
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=172.26.153.150
Write-Host "✓ Expo Metro port 8081 forwarded" -ForegroundColor Green

# Forward Expo Dev Tools
netsh interface portproxy add v4tov4 listenport=19000 listenaddress=0.0.0.0 connectport=19000 connectaddress=172.26.153.150
Write-Host "✓ Expo DevTools port 19000 forwarded" -ForegroundColor Green

# Forward Expo Web
netsh interface portproxy add v4tov4 listenport=19006 listenaddress=0.0.0.0 connectport=19006 connectaddress=172.26.153.150
Write-Host "✓ Expo Web port 19006 forwarded" -ForegroundColor Green

Write-Host "`nPort forwarding complete!" -ForegroundColor Green
Write-Host "Current forwarding rules:" -ForegroundColor Yellow
netsh interface portproxy show all

Write-Host "`nTesting backend connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Backend is accessible!" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Backend connection failed. Make sure Docker is running in WSL2." -ForegroundColor Red
}

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. In WSL2, run: cd /home/dialunds/music-tracker/mobile-app" -ForegroundColor White
Write-Host "2. Run: export REACT_NATIVE_PACKAGER_HOSTNAME=192.168.8.196" -ForegroundColor White
Write-Host "3. Run: npx expo start" -ForegroundColor White
Write-Host "4. On your phone, connect to: exp://192.168.8.196:8081" -ForegroundColor White
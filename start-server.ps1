# Stop any running Node.js processes
Write-Host "Stopping any running Node.js processes..." -ForegroundColor Yellow
taskkill /f /im node.exe 2>$null

# Start the server
Write-Host "Starting StockIT Backend Server..." -ForegroundColor Green
node index.js

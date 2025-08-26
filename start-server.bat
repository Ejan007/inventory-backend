@echo off
echo Starting StockIT Backend Server...

:: Kill any node processes that might be running
taskkill /f /im node.exe >nul 2>nul

:: Start the server
node index.js

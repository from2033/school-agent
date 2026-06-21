@echo off
setlocal

if not exist C:\school-agent\logs mkdir C:\school-agent\logs
echo.>> C:\school-agent\logs\qq-sync.log
C:\Python312\python.exe C:\school-agent\server\scripts\qq_latest.py 50 >> C:\school-agent\logs\qq-sync.log 2>&1
exit /b %ERRORLEVEL%

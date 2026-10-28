@echo off
powershell.exe -NoProfile -File "%~dp0Start-BlockTown.ps1"
if errorlevel 1 pause

@echo off
title Digital Amnik CRM - Local Testing Server
cd /d "%~dp0"
echo ==========================================================
echo Starting Digital Amnik CRM Local Server on http://localhost:8090 ...
echo ==========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0local_server.ps1"
pause

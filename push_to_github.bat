@echo off
title Push Digital Amnik CRM to GitHub
set PATH=C:\Program Files\Git\cmd;C:\Program Files\Git\ucrt64\bin;%PATH%
cd /d "c:\Users\Asus\Documents\Digital Amnik  CRM"
echo ==========================================
echo Pushing latest updates to GitHub...
echo ==========================================
git.exe push origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo -------------------------------------------------------------------
    echo Agar browser sign-in nahi hua, to apna GitHub Personal Token enter karein:
    echo -------------------------------------------------------------------
    set /p GITHUB_TOKEN="Enter GitHub Token (ya Enter dabayein exit karne ke liye): "
    if defined GITHUB_TOKEN (
        echo Pushing with Token...
        git.exe push https://%GITHUB_TOKEN%@github.com/digitalamnikCRM/digitalamnikcrm.git main
    )
)
echo.
echo ==========================================
pause

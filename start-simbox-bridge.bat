@echo off
title MayaX SIM Box Cloud Bridge
color 0A
echo ========================================================
echo   MayaX SIM Box Cloud Bridge (Starlink / Remote Support)
echo ========================================================
echo.
echo Starting secure tunnel for SIM Box Gateway (192.168.1.16:80)...
echo Please copy the HTTPS URL below and paste it as Gateway IP in MayaX Channels!
echo.
npx -y pinggy -l 80 192.168.1.16
pause

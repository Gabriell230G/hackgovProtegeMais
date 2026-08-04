@echo off
REM Atalho para o bootstrap de build do Protege+.
REM Uso:  build.cmd clean test     |     build.cmd spring-boot:run
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build.ps1" %*

@echo off
cd /d "%~dp0"
git add frontend
git commit -m "fix: include frontend as regular directory"
echo Done!

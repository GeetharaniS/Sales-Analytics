@echo off
title Telecom Predictive & ML Forecasting Suite
echo =====================================================================
echo    TAROS ML - Telecom Predictive & Machine Learning Engine
echo =====================================================================
echo.
echo [1/2] Checking Machine Learning predictions cache...
if not exist "Predictive analytics\predictions_data.json" (
    echo [INFO] Training models and generating predictions...
    py "Predictive analytics\ml_engine.py"
) else (
    echo [INFO] predictions_data.json is ready.
)
echo.
echo [2/2] Launching Web Application at http://localhost:8000 ...
echo Press Ctrl+C in this terminal window to stop the server.
echo.
start http://localhost:8000
py "Predictive analytics\server.py"
pause

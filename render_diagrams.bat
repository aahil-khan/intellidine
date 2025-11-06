@echo off
REM =============================================================================
REM PlantUML Diagram Rendering Script for IntelliDine
REM =============================================================================
REM Usage: Simply run this script to render all UML diagrams
REM Output: diagrams will be saved to DOCUMENTATION/diagrams/
REM =============================================================================

setlocal enabledelayedexpansion

echo.
echo ======================================================================
echo          IntelliDine UML Diagram Rendering Script
echo ======================================================================
echo.

REM Configuration
set PLANTUML_JAR=C:\Users\aahil\Downloads\plantuml-1.2025.10.jar
set INPUT_FILE=DOCUMENTATION\UML_DIAGRAMS.puml
set OUTPUT_DIR=DOCUMENTATION\diagrams
set OUTPUT_FORMAT=png

REM Validate PlantUML JAR exists
if not exist "%PLANTUML_JAR%" (
    echo [ERROR] PlantUML JAR not found at: %PLANTUML_JAR%
    echo Please update PLANTUML_JAR variable in this script
    pause
    exit /b 1
)

REM Validate input file exists
if not exist "%INPUT_FILE%" (
    echo [ERROR] Input file not found at: %INPUT_FILE%
    pause
    exit /b 1
)

REM Create output directory
if not exist "%OUTPUT_DIR%" (
    echo [INFO] Creating output directory: %OUTPUT_DIR%
    mkdir "%OUTPUT_DIR%"
)

echo [INFO] Configuration:
echo   PlantUML JAR: %PLANTUML_JAR%
echo   Input File:   %INPUT_FILE%
echo   Output Dir:   %OUTPUT_DIR%
echo   Format:       %OUTPUT_FORMAT%
echo.

echo [PROGRESS] Rendering diagrams...
echo.

REM Render diagrams
java -jar "%PLANTUML_JAR%" "%INPUT_FILE%" -o "%OUTPUT_DIR%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] ✓ Diagrams rendered successfully!
    echo.
    echo Generated files:
    dir /B "%OUTPUT_DIR%"
    echo.
    echo [INFO] Output location: %OUTPUT_DIR%
    echo.
    echo Press any key to open the output directory...
    pause
    start "" explorer "%OUTPUT_DIR%"
) else (
    echo.
    echo [ERROR] ✗ Failed to render diagrams (error code: %ERRORLEVEL%)
    pause
    exit /b 1
)

endlocal

@echo off
rem This batch file automates the CMake configuration and compilation of the KEVLA C++ engine

setlocal

rem Set the build directory
set BUILD_DIR=build

rem Create the build directory if it does not exist
if not exist "%BUILD_DIR%" (mkdir "%BUILD_DIR%")

rem Navigate to the build directory
cd "%BUILD_DIR%"

rem Run CMake to configure the project
cmake ..

rem Compile the project
cmake --build . --config Release

endlocal

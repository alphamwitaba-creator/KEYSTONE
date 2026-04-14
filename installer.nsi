!include "MUI2.nsh"
!include "FileFunc.nsh"

; General
Name "KEVLA Engine"
OutFile "KEVLA-Setup.exe"
InstallDir "$PROGRAMFILES64\KEVLA Engine"
InstallDirRegKey HKLM "Software\KEVLA Engine" "InstallDir"
RequestExecutionLevel admin

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_UNABORTWARNING

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installer Section
Section "Install"
    SetOutPath "$INSTDIR"
    
    ; Copy all files from bin folder
    File /r "src-cpp\build\bin\*.*"
    
    ; Copy assets folder
    SetOutPath "$INSTDIR\assets"
    File /r "assets\*.*"
    
    ; Create Start Menu shortcuts
    CreateDirectory "$SMPROGRAMS\KEVLA Engine"
    CreateShortCut "$SMPROGRAMS\KEVLA Engine\KEVLA Engine.lnk" "$INSTDIR\kevla_editor.exe" "" "$INSTDIR\kevla_editor.exe"
    CreateShortCut "$SMPROGRAMS\KEVLA Engine\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
    
    ; Create Desktop shortcut
    CreateShortCut "$DESKTOP\KEVLA Engine.lnk" "$INSTDIR\kevla_editor.exe" "" "$INSTDIR\kevla_editor.exe"
    
    ; Write registry keys
    WriteRegStr HKLM "Software\KEVLA Engine" "InstallDir" "$INSTDIR"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\KEVLA Engine" "DisplayName" "KEVLA Engine"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\KEVLA Engine" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\KEVLA Engine" "DisplayIcon" "$INSTDIR\kevla_editor.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\KEVLA Engine" "Publisher" "KEVLA"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\KEVLA Engine" "DisplayVersion" "1.0.0"
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\KEVLA Engine" "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\KEVLA Engine" "NoRepair" 1
    
    ; Get installed size
    ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
    IntFmt $0 "0x%08X" $0
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\KEVLA Engine" "EstimatedSize" "$0"
    
    ; Create uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

; Uninstaller Section
Section "Uninstall"
    ; Remove files
    RMDir /r "$INSTDIR"
    
    ; Remove Start Menu shortcuts
    RMDir /r "$SMPROGRAMS\KEVLA Engine"
    
    ; Remove Desktop shortcut
    Delete "$DESKTOP\KEVLA Engine.lnk"
    
    ; Remove registry keys
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\KEVLA Engine"
    DeleteRegKey HKLM "Software\KEVLA Engine"
SectionEnd
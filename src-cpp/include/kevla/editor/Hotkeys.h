#pragma once

#include <map>
#include <string>
#include <vector>
#include <functional>

namespace kevla {

// ============================================================
// Hotkey System
// ============================================================

/** Modifier keys */
enum class KeyModifier {
    None = 0,
    Ctrl = 1 << 0,
    Shift = 1 << 1,
    Alt = 1 << 2,
    Meta = 1 << 3  // Command on Mac, Windows key on Windows
};

/** Key codes (simplified) */
enum class KeyCode {
    None = 0,
    // Letters
    A = 'A', B = 'B', C = 'C', D = 'D', E = 'E', F = 'F',
    G = 'G', H = 'H', I = 'I', J = 'J', K = 'K', L = 'L',
    M = 'M', N = 'N', O = 'O', P = 'P', Q = 'Q', R = 'R',
    S = 'S', T = 'T', U = 'U', V = 'V', W = 'W', X = 'X',
    Y = 'Y', Z = 'Z',
    // Numbers
    Num0 = '0', Num1 = '1', Num2 = '2', Num3 = '3', Num4 = '4',
    Num5 = '5', Num6 = '6', Num7 = '7', Num8 = '8', Num9 = '9',
    // Function keys
    F1 = 0x70, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12,
    // Special
    Space = ' ',
    Enter = '\r',
    Tab = '\t',
    Escape = 0x1B,
    Backspace = 0x08,
    Delete = 0x2E,
    ArrowUp = 0x26,
    ArrowDown = 0x28,
    ArrowLeft = 0x25,
    ArrowRight = 0x27,
    Home = 0x24,
    End = 0x23,
    PageUp = 0x21,
    PageDown = 0x22,
    Insert = 0x2D,
};

/** Hotkey binding */
struct HotkeyBinding {
    std::string id;
    std::string name;
    std::string category;
    KeyCode key;
    int modifiers;
    std::function<void()> callback;
    bool enabled;
    
    HotkeyBinding()
        : key(KeyCode::None), modifiers(0), enabled(true) {}
    
    HotkeyBinding(const std::string& id, const std::string& name, 
                 KeyCode key, int modifiers, std::function<void()> callback)
        : id(id), name(name), key(key), modifiers(modifiers), 
          callback(callback), enabled(true) {}
    
    bool matches(KeyCode code, int mods) const {
        return key == code && modifiers == mods;
    }
    
    std::string getDisplayString() const {
        std::string result;
        
        if (modifiers & (int)KeyModifier::Ctrl) result += "Ctrl+";
        if (modifiers & (int)KeyModifier::Shift) result += "Shift+";
        if (modifiers & (int)KeyModifier::Alt) result += "Alt+";
        if (modifiers & (int)KeyModifier::Meta) result += "Meta+";
        
        // Convert key code to string
        if (key >= KeyCode::A && key <= KeyCode::Z) {
            result += (char)key;
        } else if (key >= KeyCode::Num0 && key <= KeyCode::Num9) {
            result += (char)key;
        } else if (key >= KeyCode::F1 && key <= KeyCode::F12) {
            result += "F" + std::to_string((int)key - (int)KeyCode::F1 + 1);
        } else {
            switch (key) {
                case KeyCode::Space: result += "Space"; break;
                case KeyCode::Enter: result += "Enter"; break;
                case KeyCode::Tab: result += "Tab"; break;
                case KeyCode::Escape: result += "Esc"; break;
                case KeyCode::Delete: result += "Del"; break;
                case KeyCode::ArrowUp: result += "Up"; break;
                case KeyCode::ArrowDown: result += "Down"; break;
                case KeyCode::ArrowLeft: result += "Left"; break;
                case KeyCode::ArrowRight: result += "Right"; break;
                default: result += "?"; break;
            }
        }
        
        return result;
    }
};

/** Hotkey manager */
class HotkeyManager {
public:
    HotkeyManager();
    ~HotkeyManager() = default;
    
    // Register a hotkey
    void registerHotkey(const std::string& id, const std::string& name,
                        const std::string& category,
                        KeyCode key, int modifiers,
                        std::function<void()> callback);
    
    // Unregister
    void unregisterHotkey(const std::string& id);
    
    // Process key event
    void onKeyEvent(KeyCode key, int modifiers, bool pressed);
    
    // Enable/Disable
    void setEnabled(bool enabled) { m_enabled = enabled; }
    bool isEnabled() const { return m_enabled; }
    
    void enableHotkey(const std::string& id);
    void disableHotkey(const std::string& id);
    
    // Get bindings
    const std::vector<HotkeyBinding>& getBindings() const { return m_bindings; }
    std::vector<HotkeyBinding> getBindingsByCategory(const std::string& category) const;
    HotkeyBinding* getBinding(const std::string& id);
    
    // Conflict detection
    std::vector<std::string> getConflicts(const std::string& id) const;
    
    // Load/Save (for user preferences)
    std::string serialize() const;
    void deserialize(const std::string& data);
    
    // Default hotkeys setup
    void setupDefaults();
    
private:
    std::vector<HotkeyBinding> m_bindings;
    bool m_enabled = true;
    
    // Find binding index
    int findBinding(const std::string& id) const;
};

// ============================================================
// Common Editor Hotkeys
// ============================================================

namespace EditorHotkeys {
    // File
    inline const char* NEW_SCENE = "file.new";
    inline const char* OPEN_SCENE = "file.open";
    inline const char* SAVE_SCENE = "file.save";
    inline const char* SAVE_AS = "file.saveas";
    inline const char* EXIT = "file.exit";
    
    // Edit
    inline const char* UNDO = "edit.undo";
    inline const char* REDO = "edit.redo";
    inline const char* CUT = "edit.cut";
    inline const char* COPY = "edit.copy";
    inline const char* PASTE = "edit.paste";
    inline const char* DELETE = "edit.delete";
    inline const char* DUPLICATE = "edit.duplicate";
    inline const char* SELECT_ALL = "edit.selectall";
    
    // GameObject
    inline const char* CREATE_EMPTY = "gameobject.create";
    inline const char* CREATE_CUBE = "gameobject.createcube";
    inline const char* CREATE_SPHERE = "gameobject.createsphere";
    inline const char* CREATE_CAMERA = "gameobject.createcamera";
    inline const char* CREATE_LIGHT = "gameobject.createlight";
    
    // Tools
    inline const char* TOOL_SELECT = "tool.select";
    inline const char* TOOL_MOVE = "tool.move";
    inline const char* TOOL_ROTATE = "tool.rotate";
    inline const char* TOOL_SCALE = "tool.scale";
    
    // Play
    inline const char* PLAY = "play.play";
    inline const char* PAUSE = "play.pause";
    inline const char* STOP = "play.stop";
    inline const char* STEP = "play.step";
}

} // namespace kevla
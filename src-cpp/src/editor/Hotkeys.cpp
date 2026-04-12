#include "kevla/editor/Hotkeys.h"
#include <algorithm>
#include <sstream>

namespace kevla {

HotkeyManager::HotkeyManager() {
    setupDefaults();
}

void HotkeyManager::registerHotkey(const std::string& id, const std::string& name,
                                   const std::string& category,
                                   KeyCode key, int modifiers,
                                   std::function<void()> callback) {
    if (findBinding(id) >= 0) {
        unregisterHotkey(id);
    }

    HotkeyBinding binding;
    binding.id = id;
    binding.name = name;
    binding.category = category;
    binding.key = key;
    binding.modifiers = modifiers;
    binding.callback = callback;
    binding.enabled = true;

    m_bindings.push_back(binding);
}

void HotkeyManager::unregisterHotkey(const std::string& id) {
    int idx = findBinding(id);
    if (idx >= 0) {
        m_bindings.erase(m_bindings.begin() + idx);
    }
}

void HotkeyManager::onKeyEvent(KeyCode key, int modifiers, bool pressed) {
    if (!m_enabled || !pressed) return;

    for (auto& binding : m_bindings) {
        if (!binding.enabled) continue;

        if (binding.matches(key, modifiers)) {
            if (binding.callback) {
                binding.callback();
            }
            break;
        }
    }
}

void HotkeyManager::enableHotkey(const std::string& id) {
    int idx = findBinding(id);
    if (idx >= 0) {
        m_bindings[idx].enabled = true;
    }
}

void HotkeyManager::disableHotkey(const std::string& id) {
    int idx = findBinding(id);
    if (idx >= 0) {
        m_bindings[idx].enabled = false;
    }
}

std::vector<HotkeyBinding> HotkeyManager::getBindingsByCategory(const std::string& category) const {
    std::vector<HotkeyBinding> result;
    for (const auto& binding : m_bindings) {
        if (binding.category == category) {
            result.push_back(binding);
        }
    }
    return result;
}

HotkeyBinding* HotkeyManager::getBinding(const std::string& id) {
    int idx = findBinding(id);
    if (idx >= 0) {
        return &m_bindings[idx];
    }
    return nullptr;
}

std::vector<std::string> HotkeyManager::getConflicts(const std::string& id) const {
    std::vector<std::string> conflicts;

    int idx = findBinding(id);
    if (idx < 0) return conflicts;

    const HotkeyBinding& binding = m_bindings[idx];

    for (const auto& other : m_bindings) {
        if (other.id == id) continue;
        if (!other.enabled) continue;

        if (other.key == binding.key && other.modifiers == binding.modifiers) {
            conflicts.push_back(other.id);
        }
    }

    return conflicts;
}

std::string HotkeyManager::serialize() const {
    std::ostringstream oss;

    for (const auto& binding : m_bindings) {
        oss << binding.id << "|"
            << binding.name << "|"
            << binding.category << "|"
            << (int)binding.key << "|"
            << binding.modifiers << "|"
            << (binding.enabled ? 1 : 0) << "\n";
    }

    return oss.str();
}

void HotkeyManager::deserialize(const std::string& data) {
    m_bindings.clear();

    std::istringstream iss(data);
    std::string line;

    while (std::getline(iss, line)) {
        if (line.empty()) continue;

        std::istringstream parts(line);
        std::string id, name, category, keyStr, modStr, enabledStr;

        std::getline(parts, id, '|');
        std::getline(parts, name, '|');
        std::getline(parts, category, '|');
        std::getline(parts, keyStr, '|');
        std::getline(parts, modStr, '|');
        std::getline(parts, enabledStr, '|');

        HotkeyBinding binding;
        binding.id = id;
        binding.name = name;
        binding.category = category;
        binding.key = (KeyCode)std::stoi(keyStr);
        binding.modifiers = std::stoi(modStr);
        binding.enabled = std::stoi(enabledStr) == 1;

        m_bindings.push_back(binding);
    }
}

void HotkeyManager::setupDefaults() {
    registerHotkey(EditorHotkeys::NEW_SCENE, "New Scene", "File",
                  KeyCode::N, (int)KeyModifier::Ctrl,
                  nullptr);

    registerHotkey(EditorHotkeys::OPEN_SCENE, "Open Scene", "File",
                  KeyCode::O, (int)KeyModifier::Ctrl,
                  nullptr);

    registerHotkey(EditorHotkeys::SAVE_SCENE, "Save Scene", "File",
                  KeyCode::S, (int)KeyModifier::Ctrl,
                  nullptr);

    registerHotkey(EditorHotkeys::SAVE_AS, "Save As", "File",
                  KeyCode::S, (int)KeyModifier::Ctrl | (int)KeyModifier::Shift,
                  nullptr);

    registerHotkey(EditorHotkeys::EXIT, "Exit", "File",
                  KeyCode::Escape, (int)KeyModifier::None,
                  nullptr);

    registerHotkey(EditorHotkeys::UNDO, "Undo", "Edit",
                  KeyCode::Z, (int)KeyModifier::Ctrl,
                  nullptr);

    registerHotkey(EditorHotkeys::REDO, "Redo", "Edit",
                  KeyCode::Z, (int)KeyModifier::Ctrl | (int)KeyModifier::Shift,
                  nullptr);

    registerHotkey(EditorHotkeys::CUT, "Cut", "Edit",
                  KeyCode::X, (int)KeyModifier::Ctrl,
                  nullptr);

    registerHotkey(EditorHotkeys::COPY, "Copy", "Edit",
                  KeyCode::C, (int)KeyModifier::Ctrl,
                  nullptr);

    registerHotkey(EditorHotkeys::PASTE, "Paste", "Edit",
                  KeyCode::V, (int)KeyModifier::Ctrl,
                  nullptr);

    registerHotkey(EditorHotkeys::DELETE, "Delete", "Edit",
                  KeyCode::Delete, (int)KeyModifier::None,
                  nullptr);

    registerHotkey(EditorHotkeys::DUPLICATE, "Duplicate", "Edit",
                  KeyCode::D, (int)KeyModifier::Ctrl,
                  nullptr);

    registerHotkey(EditorHotkeys::SELECT_ALL, "Select All", "Edit",
                  KeyCode::A, (int)KeyModifier::Ctrl,
                  nullptr);

    registerHotkey(EditorHotkeys::CREATE_EMPTY, "Create Empty", "GameObject",
                  KeyCode::Shift | 0x30, (int)KeyModifier::None,
                  nullptr);

    registerHotkey(EditorHotkeys::CREATE_CUBE, "Create Cube", "GameObject",
                  KeyCode::Shift | 0x31, (int)KeyModifier::None,
                  nullptr);

    registerHotkey(EditorHotkeys::CREATE_SPHERE, "Create Sphere", "GameObject",
                  KeyCode::Shift | 0x32, (int)KeyModifier::None,
                  nullptr);

    registerHotkey(EditorHotkeys::CREATE_CAMERA, "Create Camera", "GameObject",
                  KeyCode::Shift | 0x33, (int)KeyModifier::None,
                  nullptr);

    registerHotkey(EditorHotkeys::CREATE_LIGHT, "Create Light", "GameObject",
                  KeyCode::Shift | 0x34, (int)KeyModifier::None,
                  nullptr);

    registerHotkey(EditorHotkeys::TOOL_SELECT, "Select Tool", "Tools",
                  KeyCode::Q, (int)KeyModifier::None,
                  nullptr);

    registerHotkey(EditorHotkeys::TOOL_MOVE, "Move Tool", "Tools",
                  KeyCode::W, (int)KeyModifier::None,
                  nullptr);

    registerHotkey(EditorHotkeys::TOOL_ROTATE, "Rotate Tool", "Tools",
                  KeyCode::E, (int)KeyModifier::None,
                  nullptr);

    registerHotkey(EditorHotkeys::TOOL_SCALE, "Scale Tool", "Tools",
                  KeyCode::R, (int)KeyModifier::None,
                  nullptr);

    registerHotkey(EditorHotkeys::PLAY, "Play", "Play",
                  KeyCode::F5, (int)KeyModifier::None,
                  nullptr);

    registerHotkey(EditorHotkeys::PAUSE, "Pause", "Play",
                  KeyCode::F6, (int)KeyModifier::None,
                  nullptr);

    registerHotkey(EditorHotkeys::STOP, "Stop", "Play",
                  KeyCode::F5, (int)KeyModifier::Shift,
                  nullptr);

    registerHotkey(EditorHotkeys::STEP, "Step", "Play",
                  KeyCode::F7, (int)KeyModifier::None,
                  nullptr);
}

int HotkeyManager::findBinding(const std::string& id) const {
    for (size_t i = 0; i < m_bindings.size(); ++i) {
        if (m_bindings[i].id == id) {
            return (int)i;
        }
    }
    return -1;
}

} // namespace kevla
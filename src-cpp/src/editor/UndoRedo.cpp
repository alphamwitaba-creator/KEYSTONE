#include "kevla/editor/UndoRedo.h"

namespace kevla {

void UndoRedoManager::push(std::unique_ptr<IAction> action) {
    if (!action) return;
    
    action->execute();
    m_redoStack.clear();
    m_undoStack.push_back(std::move(action));
    prune();
}

bool UndoRedoManager::undo() {
    if (m_undoStack.empty()) return false;
    
    auto& action = m_undoStack.back();
    action->undo();
    m_redoStack.push_back(std::move(action));
    m_undoStack.pop_back();
    
    return true;
}

bool UndoRedoManager::redo() {
    if (m_redoStack.empty()) return false;
    
    auto& action = m_redoStack.back();
    action->execute();
    m_undoStack.push_back(std::move(action));
    m_redoStack.pop_back();
    
    return true;
}

void UndoRedoManager::clear() {
    m_undoStack.clear();
    m_redoStack.clear();
}

std::string UndoRedoManager::getUndoDescription() const {
    if (m_undoStack.empty()) return "Nothing to undo";
    return m_undoStack.back()->getDescription();
}

std::string UndoRedoManager::getRedoDescription() const {
    if (m_redoStack.empty()) return "Nothing to redo";
    return m_redoStack.back()->getDescription();
}

void UndoRedoManager::prune() {
    while ((int)m_undoStack.size() > m_maxHistory) {
        m_undoStack.erase(m_undoStack.begin());
    }
}

} // namespace kevla
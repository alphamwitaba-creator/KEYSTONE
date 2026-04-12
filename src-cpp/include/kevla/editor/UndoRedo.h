#pragma once

#include <vector>
#include <string>
#include <functional>
#include <memory>

namespace kevla {

// ============================================================
// Undo/Redo System
// ============================================================

/** Base action for undo/redo */
class IAction {
public:
    virtual ~IAction() = default;
    
    virtual void execute() = 0;
    virtual void undo() = 0;
    
    virtual std::string getDescription() const = 0;
    virtual bool isMergeable() const { return false; }
    
protected:
    IAction() = default;
    IAction(const IAction&) = default;
};

/** Concrete action implementation */
template<typename T>
class Action : public IAction {
public:
    using ExecuteFunc = std::function<void(T&)>;
    using DescriptionFunc = std::function<std::string()>;
    
    Action(T& target, ExecuteFunc execute, ExecuteFunc undo, DescriptionFunc description)
        : m_target(target), m_execute(execute), m_undo(undo), m_description(description) {}
    
    void execute() override {
        if (m_execute) m_execute(m_target);
    }
    
    void undo() override {
        if (m_undo) m_undo(m_target);
    }
    
    std::string getDescription() const override {
        return m_description ? m_description() : "Action";
    }
    
    bool isMergeable() const override { return true; }
    
private:
    T& m_target;
    ExecuteFunc m_execute;
    ExecuteFunc m_undo;
    DescriptionFunc m_description;
};

/** Undo/Redo stack manager */
class UndoRedoManager {
public:
    UndoRedoManager() = default;
    ~UndoRedoManager() = default;
    
    // Push new action onto undo stack
    void push(std::unique_ptr<IAction> action);
    
    // Undo last action
    bool undo();
    
    // Redo last undone action
    bool redo();
    
    // Clear all history
    void clear();
    
    // Check capabilities
    bool canUndo() const { return !m_undoStack.empty(); }
    bool canRedo() const { return !m_redoStack.empty(); }
    
    // Get action descriptions
    std::string getUndoDescription() const;
    std::string getRedoDescription() const;
    
    // Merge actions (combine consecutive mergeable actions)
    void setMaxHistory(int max) { m_maxHistory = max; }
    
    // Direct action execution with automatic undo registration
    template<typename T>
    void execute(T& target, 
        typename Action<T>::ExecuteFunc execute,
        typename Action<T>::ExecuteFunc undo,
        typename Action<T>::DescriptionFunc description) {
        
        auto act = std::make_unique<Action<T>>(target, execute, undo, description);
        act->execute();
        push(std::move(act));
    }
    
private:
    std::vector<std::unique_ptr<IAction>> m_undoStack;
    std::vector<std::unique_ptr<IAction>> m_redoStack;
    
    int m_maxHistory = 100;
    
    void prune();
};

// ============================================================
// Common Actions
// ============================================================

// Property change action
template<typename T, typename PropType>
class PropertyAction : public IAction {
public:
    using Getter = std::function<PropType()>;
    using Setter = std::function<void(PropType)>;
    
    PropertyAction(Getter getter, Setter setter, const std::string& desc)
        : m_getter(getter), m_setter(setter), m_description(desc) {
        m_oldValue = getter();
    }
    
    void execute() override {
        m_newValue = m_getter();
        m_setter(m_newValue);
    }
    
    void undo() override {
        m_setter(m_oldValue);
    }
    
    std::string getDescription() const override {
        return m_description;
    }
    
    bool isMergeable() const override { return true; }
    
private:
    Getter m_getter;
    Setter m_setter;
    PropType m_oldValue;
    PropType m_newValue;
    std::string m_description;
};

// Entity creation action
class CreateEntityAction : public IAction {
public:
    CreateEntityAction(class Entity* entity, class Scene* scene)
        : m_entity(entity), m_scene(scene) {}
    
    void execute() override {
        // Entity already created
    }
    
    void undo() override {
        if (m_scene && m_entity) {
            m_scene->destroyEntity(m_entity);
        }
    }
    
    std::string getDescription() const override {
        return "Create " + m_entity->getName();
    }
    
private:
    class Entity* m_entity;
    class Scene* m_scene;
};

// Entity deletion action
class DeleteEntityAction : public IAction {
public:
    DeleteEntityAction(class Entity* entity, class Scene* scene)
        : m_entity(entity), m_scene(scene), m_entityData(entity->getName()) {}
    
    void execute() override {
        if (m_scene && m_entity) {
            m_scene->destroyEntity(m_entity);
        }
    }
    
    void undo() override {
        // Would need to serialize/deserialize entity
    }
    
    std::string getDescription() const override {
        return "Delete " + m_entityData;
    }
    
private:
    class Entity* m_entity;
    class Scene* m_scene;
    std::string m_entityData;
};

} // namespace kevla
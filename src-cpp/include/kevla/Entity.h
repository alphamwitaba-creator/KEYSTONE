#pragma once

#include "Types.h"
#include "Vector.h"
#include "Matrix.h"

namespace kevla {

// ============================================================
// Entity Component System
// ============================================================

class Entity {
public:
    using ID = uint64_t;
    
    Entity(ID id, const std::string& name = "Entity")
        : m_id(id), m_name(name), m_active(true) {}
    
    ~Entity() = default;
    
    ID getID() const { return m_id; }
    const std::string& getName() const { return m_name; }
    void setName(const std::string& name) { m_name = name; }
    
    bool isActive() const { return m_active; }
    void setActive(bool active) { m_active = active; }
    
    // Transform
    Transform& getTransform() { return m_transform; }
    const Transform& getTransform() const { return m_transform; }
    void setPosition(const Vector3& pos) { m_transform.position = pos; }
    void setRotation(const Vector3& rot) { m_transform.rotation = rot; }
    void setScale(const Vector3& scale) { m_transform.scale = scale; }
    
    // Hierarchy
    Entity* getParent() const { return m_parent; }
    void setParent(Entity* parent) { m_parent = parent; }
    const std::vector<Entity*>& getChildren() const { return m_children; }
    
    void addChild(Entity* child) {
        if (child) {
            child->m_parent = this;
            m_children.push_back(child);
        }
    }
    
    void removeChild(Entity* child) {
        auto it = std::find(m_children.begin(), m_children.end(), child);
        if (it != m_children.end()) {
            m_children.erase(it);
            if (child->m_parent == this) {
                child->m_parent = nullptr;
            }
        }
    }
    
    // Tagging
    void addTag(const std::string& tag) { m_tags.push_back(tag); }
    void removeTag(const std::string& tag) {
        m_tags.erase(std::remove(m_tags.begin(), m_tags.end(), tag), m_tags.end());
    }
    bool hasTag(const std::string& tag) const {
        return std::find(m_tags.begin(), m_tags.end(), tag) != m_tags.end();
    }
    
    // Layer
    int getLayer() const { return m_layer; }
    void setLayer(int layer) { m_layer = layer; }
    
    // Component management
    template<typename T>
    T* addComponent() {
        auto id = typeid(T).name();
        if (m_components.find(id) == m_components.end()) {
            m_components[id] = std::make_shared<T>(this);
            return static_cast<T*>(m_components[id].get());
        }
        return nullptr;
    }
    
    template<typename T>
    T* getComponent() {
        auto id = typeid(T).name();
        auto it = m_components.find(id);
        if (it != m_components.end()) {
            return static_cast<T*>(it->second.get());
        }
        return nullptr;
    }
    
    template<typename T>
    bool hasComponent() {
        return m_components.find(typeid(T).name()) != m_components.end();
    }
    
    template<typename T>
    void removeComponent() {
        m_components.erase(typeid(T).name());
    }
    
private:
    ID m_id;
    std::string m_name;
    bool m_active;
    Transform m_transform;
    
    Entity* m_parent = nullptr;
    std::vector<Entity*> m_children;
    
    std::vector<std::string> m_tags;
    int m_layer = 0;
    
    std::unordered_map<std::string, std::shared_ptr<void>> m_components;
};

// ============================================================
// Entity Manager
// ============================================================

class EntityManager {
public:
    EntityManager() = default;
    ~EntityManager() { clear(); }
    
    Entity* create(const std::string& name = "Entity") {
        Entity::ID id = ++m_nextId;
        auto entity = std::make_unique<Entity>(id, name);
        Entity* ptr = entity.get();
        m_entities[id] = std::move(entity);
        return ptr;
    }
    
    void destroy(Entity::ID id) {
        m_entities.erase(id);
    }
    
    Entity* get(Entity::ID id) {
        auto it = m_entities.find(id);
        if (it != m_entities.end()) {
            return it->second.get();
        }
        return nullptr;
    }
    
    void clear() {
        m_entities.clear();
    }
    
    size_t getCount() const { return m_entities.size(); }
    
    template<typename Func>
    void forEach(Func func) {
        for (auto& [id, entity] : m_entities) {
            func(entity.get());
        }
    }
    
private:
    std::unordered_map<Entity::ID, std::unique_ptr<Entity>> m_entities;
    Entity::ID m_nextId = 0;
};

} // namespace kevla
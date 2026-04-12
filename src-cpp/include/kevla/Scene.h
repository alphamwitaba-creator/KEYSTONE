#pragma once

#include "Types.h"
#include "Vector.h"

namespace kevla {

// ============================================================
// Scene - Container for all entities
// ============================================================

class Scene {
public:
    Scene() = default;
    ~Scene() = default;
    
    void clear();
    
    // Entity management
    Entity* createEntity(const std::string& name = "Entity");
    void destroyEntity(Entity* entity);
    void destroyEntity(Entity::ID id);
    
    Entity* getEntity(Entity::ID id) const;
    Entity* getEntityByName(const std::string& name) const;
    
    // Find entities
    template<typename Func>
    void findEntitiesByTag(const std::string& tag, Func&& func) {
        for (auto& [id, entity] : m_entities) {
            if (entity->hasTag(tag)) {
                func(entity.get());
            }
        }
    }
    
    // Iterate
    template<typename Func>
    void forEachEntity(Func&& func) {
        for (auto& [id, entity] : m_entities) {
            func(entity.get());
        }
    }
    
    size_t getEntityCount() const { return m_entities.size(); }
    
    // Scene settings
    void setName(const std::string& name) { m_name = name; }
    const std::string& getName() const { return m_name; }
    
    // Active camera
    void setActiveCamera(class Camera* camera);
    Camera* getActiveCamera() const { return m_activeCamera; }
    
private:
    std::string m_name = "Untitled Scene";
    std::unordered_map<Entity::ID, std::unique_ptr<Entity>> m_entities;
    
    class Camera* m_activeCamera = nullptr;
};

// ============================================================
// Scene Manager
// ============================================================

class SceneManager {
public:
    SceneManager() = default;
    ~SceneManager() = default;
    
    Scene* createScene(const std::string& name = "Untitled");
    void destroyScene(Scene* scene);
    void setActiveScene(Scene* scene);
    Scene* getActiveScene() const { return m_activeScene; }
    
    // Scene persistence
    Status loadScene(const std::string& path);
    Status saveScene(const std::string& path) const;
    
private:
    std::vector<std::unique_ptr<Scene>> m_scenes;
    Scene* m_activeScene = nullptr;
};

} // namespace kevla
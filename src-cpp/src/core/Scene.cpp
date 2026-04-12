#include "kevla/Scene.h"
#include "kevla/Entity.h"

namespace kevla {

void Scene::clear() {
    m_entities.clear();
    m_activeCamera = nullptr;
}

Entity* Scene::createEntity(const std::string& name) {
    Entity::ID id = (Entity::ID)m_entities.size() + 1;
    auto entity = std::make_unique<Entity>(id, name);
    Entity* ptr = entity.get();
    m_entities[id] = std::move(entity);
    return ptr;
}

void Scene::destroyEntity(Entity* entity) {
    if (entity) {
        destroyEntity(entity->getID());
    }
}

void Scene::destroyEntity(Entity::ID id) {
    m_entities.erase(id);
}

Entity* Scene::getEntity(Entity::ID id) const {
    auto it = m_entities.find(id);
    if (it != m_entities.end()) {
        return it->second.get();
    }
    return nullptr;
}

Entity* Scene::getEntityByName(const std::string& name) const {
    for (auto& [id, entity] : m_entities) {
        if (entity->getName() == name) {
            return entity.get();
        }
    }
    return nullptr;
}

void Scene::setActiveCamera(Camera* camera) {
    m_activeCamera = camera;
}

Scene* SceneManager::createScene(const std::string& name) {
    auto scene = std::make_unique<Scene>();
    scene->setName(name);
    Scene* ptr = scene.get();
    m_scenes.push_back(std::move(scene));
    return ptr;
}

void SceneManager::destroyScene(Scene* scene) {
    auto it = std::find_if(m_scenes.begin(), m_scenes.end(),
        [scene](const std::unique_ptr<Scene>& s) { return s.get() == scene; });
    if (it != m_scenes.end()) {
        m_scenes.erase(it);
    }
}

void SceneManager::setActiveScene(Scene* scene) {
    m_activeScene = scene;
}

Status SceneManager::loadScene(const std::string& path) {
    (void)path;
    return Status::OK();
}

Status SceneManager::saveScene(const std::string& path) const {
    (void)path;
    return Status::OK();
}

} // namespace kevla
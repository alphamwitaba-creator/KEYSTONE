#include "kevla/serialization/SceneSerialization.h"
#include "kevla/Scene.h"
#include "kevla/Entity.h"
#include <algorithm>
#include <sstream>
#include <iomanip>

namespace kevla {

// ============================================================
// Property Template Specializations
// ============================================================

template<>
float Property::getValue<float>() const {
    return std::stof(value);
}

template<>
int Property::getValue<int>() const {
    return std::stoi(value);
}

template<>
bool Property::getValue<bool>() const {
    return value == "true" || value == "1";
}

template<>
std::string Property::getValue<std::string>() const {
    return value;
}

template<>
void Property::setValue<float>(const float& v) {
    value = std::to_string(v);
    type = "float";
}

template<>
void Property::setValue<int>(const int& v) {
    value = std::to_string(v);
    type = "int";
}

template<>
void Property::setValue<bool>(const bool& v) {
    value = v ? "true" : "false";
    type = "bool";
}

template<>
void Property::setValue<std::string>(const std::string& v) {
    value = v;
    type = "string";
}

// ============================================================
// ComponentSerializer Implementation
// ============================================================

void ComponentSerializer::registerSerializer(
    const std::string& componentType,
    std::function<bool(std::ostream&, Component*)> serializeFn,
    std::function<bool(std::istream&, Component*)> deserializeFn) {
    
    SerializerFn fn;
    fn.serialize = serializeFn;
    fn.deserialize = deserializeFn;
    m_serializers[componentType] = fn;
}

bool ComponentSerializer::serializeComponent(std::ostream& stream, Component* component) const {
    if (!component) return false;
    
    std::string type = typeid(*component).name();
    auto it = m_serializers.find(type);
    
    if (it != m_serializers.end() && it->second.serialize) {
        return it->second.serialize(stream, component);
    }
    
    return false;
}

bool ComponentSerializer::deserializeComponent(std::istream& stream, Component* component) const {
    if (!component) return false;
    
    std::string type = typeid(*component).name();
    auto it = m_serializers.find(type);
    
    if (it != m_serializers.end() && it->second.deserialize) {
        return it->second.deserialize(stream, component);
    }
    
    return false;
}

// ============================================================
// SceneSerializer Implementation
// ============================================================

SceneSerializer::SceneSerializer()
{
}

bool SceneSerializer::serializeScene(const class Scene& scene, const std::string& path) {
    std::ofstream stream(path, std::ios::binary);
    if (!stream.is_open()) {
        return false;
    }
    
    if (m_format == SerializationFormat::JSON) {
        return serializeJSON(scene, stream);
    } else if (m_format == SerializationFormat::Binary) {
        return serializeBinary(scene, stream);
    }
    
    return false;
}

bool SceneSerializer::deserializeScene(class Scene& scene, const std::string& path) {
    std::ifstream stream(path, std::ios::binary);
    if (!stream.is_open()) {
        return false;
    }
    
    if (m_format == SerializationFormat::JSON) {
        return deserializeJSON(scene, stream);
    } else if (m_format == SerializationFormat::Binary) {
        return deserializeBinary(scene, stream);
    }
    
    return false;
}

std::string SceneSerializer::serializeSceneToString(const class Scene& scene) {
    std::stringstream stream;
    if (m_format == SerializationFormat::JSON) {
        serializeJSON(scene, stream);
    }
    return stream.str();
}

bool SceneSerializer::deserializeSceneFromString(class Scene& scene, const std::string& data) {
    std::stringstream stream(data);
    if (m_format == SerializationFormat::JSON) {
        return deserializeJSON(scene, stream);
    }
    return false;
}

bool SceneSerializer::serializeJSON(const class Scene& scene, std::ostream& stream) {
    stream << "{\n";
    stream << "  \"scene\": {\n";
    stream << "    \"name\": \"" << scene.getName() << "\",\n";
    stream << "    \"version\": \"1.0\"\n";
    stream << "  },\n";
    stream << "  \"entities\": [\n";
    
    bool firstEntity = true;
    scene.forEachEntity([&stream, &firstEntity](Entity* entity) {
        if (!firstEntity) stream << ",\n";
        firstEntity = false;
        
        stream << "    {\n";
        stream << "      \"name\": \"" << entity->getName() << "\",\n";
        stream << "      \"id\": " << entity->getID() << ",\n";
        stream << "      \"active\": " << (entity->isActive() ? "true" : "false") << ",\n";
        stream << "      \"position\": [" << entity->getPosition().x << ", " 
               << entity->getPosition().y << ", " << entity->getPosition().z << "],\n";
        stream << "      \"rotation\": [" << entity->getRotation().x << ", " 
               << entity->getRotation().y << ", " << entity->getRotation().z << "],\n";
        stream << "      \"scale\": [" << entity->getScale().x << ", " 
               << entity->getScale().y << ", " << entity->getScale().z << "]\n";
        
        auto& children = entity->getChildren();
        if (!children.empty()) {
            stream << "      \"children\": [";
            bool first = true;
            for (auto* child : children) {
                if (!first) stream << ", ";
                first = false;
                stream << child->getID();
            }
            stream << "]\n";
        }
        
        stream << "    }";
    });
    
    stream << "\n  ]\n";
    stream << "}\n";
    
    return true;
}

bool SceneSerializer::deserializeJSON(class Scene& scene, std::istream& stream) {
    scene.clear();
    
    std::string line;
    std::string currentEntity;
    
    while (std::getline(stream, line)) {
        if (line.find("\"name\":") != std::string::npos) {
            size_t start = line.find("\"") + 1;
            size_t end = line.find("\"", start);
            std::string name = line.substr(start, end - start);
            
            Entity* entity = scene.createEntity(name);
            (void)entity;
        }
    }
    
    return true;
}

bool SceneSerializer::serializeBinary(const class Scene& scene, std::ostream& stream) {
    char magic[8] = "KEVLA_SC";
    stream.write(magic, 8);
    
    uint32_t version = 1;
    stream.write((char*)&version, sizeof(uint32_t));
    
    std::string name = scene.getName();
    uint32_t nameLen = (uint32_t)name.length();
    stream.write((char*)&nameLen, sizeof(uint32_t));
    stream.write(name.c_str(), nameLen);
    
    uint32_t entityCount = (uint32_t)scene.getEntityCount();
    stream.write((char*)&entityCount, sizeof(uint32_t));
    
    scene.forEachEntity([&stream](Entity* entity) {
        uint64_t id = entity->getID();
        stream.write((char*)&id, sizeof(uint64_t));
        
        std::string name = entity->getName();
        uint32_t nameLen = (uint32_t)name.length();
        stream.write((char*)&nameLen, sizeof(uint32_t));
        stream.write(name.c_str(), nameLen);
        
        uint8_t active = entity->isActive() ? 1 : 0;
        stream.write((char*)&active, sizeof(uint8_t));
        
        Vector3 pos = entity->getPosition();
        Vector3 rot = entity->getRotation();
        Vector3 scale = entity->getScale();
        
        stream.write((char*)&pos, sizeof(Vector3));
        stream.write((char*)&rot, sizeof(Vector3));
        stream.write((char*)&scale, sizeof(Vector3));
    });
    
    return true;
}

bool SceneSerializer::deserializeBinary(class Scene& scene, std::istream& stream) {
    char magic[8];
    stream.read(magic, 8);
    
    uint32_t version;
    stream.read((char*)&version, sizeof(uint32_t));
    
    uint32_t nameLen;
    stream.read((char*)&nameLen, sizeof(uint32_t));
    
    std::string name(nameLen, ' ');
    stream.read(&name[0], nameLen);
    scene.setName(name);
    
    uint32_t entityCount;
    stream.read((char*)&entityCount, sizeof(uint32_t));
    
    for (uint32_t i = 0; i < entityCount; i++) {
        uint64_t id;
        stream.read((char*)&id, sizeof(uint64_t));
        
        uint32_t entNameLen;
        stream.read((char*)&entNameLen, sizeof(uint32_t));
        
        std::string entName(entNameLen, ' ');
        stream.read(&entName[0], entNameLen);
        
        uint8_t active;
        stream.read((char*)&active, sizeof(uint8_t));
        
        Vector3 pos, rot, scale;
        stream.read((char*)&pos, sizeof(Vector3));
        stream.read((char*)&rot, sizeof(Vector3));
        stream.read((char*)&scale, sizeof(Vector3));
        
        Entity* entity = scene.createEntity(entName);
        entity->setActive(active != 0);
        entity->setPosition(pos);
        entity->setRotation(rot);
        entity->setScale(scale);
    }
    
    return true;
}

// ============================================================
// EntitySerializer Implementation
// ============================================================

EntitySerializer::EntitySerializer()
    : m_includeChildren(true)
    , m_includeComponents(true)
{
}

bool EntitySerializer::serializeEntity(std::ostream& stream, class Entity* entity, int depth) {
    if (!entity) return false;
    
    std::string indent(depth * 4, ' ');
    
    stream << indent << "{\n";
    stream << indent << "  \"name\": \"" << entity->getName() << "\",\n";
    stream << indent << "  \"id\": " << entity->getID() << ",\n";
    stream << indent << "  \"active\": " << (entity->isActive() ? "true" : "false") << ",\n";
    
    serializeTransform(stream, entity->getTransform(), depth + 1);
    
    if (m_includeComponents) {
        serializeComponents(stream, entity, depth + 1);
    }
    
    if (m_includeChildren) {
        serializeChildren(stream, entity, depth + 1);
    }
    
    stream << indent << "}";
    
    return true;
}

bool EntitySerializer::deserializeEntity(std::istream& stream, class Entity* entity) {
    (void)stream;
    (void)entity;
    return false;
}

void EntitySerializer::serializeTransform(std::ostream& stream, class Transform& transform, int depth) {
    std::string indent(depth * 4, ' ');
    
    stream << indent << "\"transform\": {\n";
    stream << indent << "  \"position\": [" << transform.position.x << ", " 
           << transform.position.y << ", " << transform.position.z << "],\n";
    stream << indent << "  \"rotation\": [" << transform.rotation.x << ", " 
           << transform.rotation.y << ", " << transform.rotation.z << "],\n";
    stream << indent << "  \"scale\": [" << transform.scale.x << ", " 
           << transform.scale.y << ", " << transform.scale.z << "]\n";
    stream << indent << "},\n";
}

void EntitySerializer::serializeComponents(std::ostream& stream, class Entity* entity, int depth) {
    (void)stream;
    (void)entity;
    (void)depth;
}

void EntitySerializer::serializeChildren(std::ostream& stream, class Entity* entity, int depth) {
    auto& children = entity->getChildren();
    if (children.empty()) return;
    
    std::string indent(depth * 4, ' ');
    
    stream << indent << "\"children\": [\n";
    
    bool first = true;
    for (auto* child : children) {
        if (!first) stream << ",\n";
        first = false;
        serializeEntity(stream, child, depth + 1);
    }
    
    stream << "\n" << indent << "]\n";
}

// ============================================================
// SceneSnapshot Implementation
// ============================================================

void SceneSnapshot::capture(const class Scene& scene) {
    SceneSerializer serializer;
    m_data = serializer.serializeSceneToString(scene);
}

void SceneSnapshot::restore(class Scene& scene) {
    SceneSerializer serializer;
    serializer.deserializeSceneFromString(scene, m_data);
}

// ============================================================
// SceneHistory Implementation
// ============================================================

SceneHistory::SceneHistory(size_t maxHistory)
    : m_maxHistory(maxHistory)
{
}

void SceneHistory::pushState(const SceneSnapshot& snapshot) {
    m_undoStack.push_back(snapshot);
    
    if (m_undoStack.size() > m_maxHistory) {
        m_undoStack.erase(m_undoStack.begin());
    }
    
    m_redoStack.clear();
}

bool SceneHistory::undo(class Scene& scene) {
    if (!canUndo()) return false;
    
    m_redoStack.push_back(m_undoStack.back());
    m_undoStack.pop_back();
    
    m_undoStack.back().restore(scene);
    return true;
}

bool SceneHistory::redo(class Scene& scene) {
    if (!canRedo()) return false;
    
    m_undoStack.push_back(m_redoStack.back());
    m_redoStack.pop_back();
    
    m_undoStack.back().restore(scene);
    return true;
}

const std::string& SceneHistory::getUndoDescription() const {
    static std::string empty = "Nothing to undo";
    if (!canUndo()) return empty;
    return m_undoStack.back().getName();
}

const std::string& SceneHistory::getRedoDescription() const {
    static std::string empty = "Nothing to redo";
    if (!canRedo()) return empty;
    return m_redoStack.back().getName();
}

void SceneHistory::clear() {
    m_undoStack.clear();
    m_redoStack.clear();
}

// ============================================================
// Project Implementation
// ============================================================

Project::Project()
    : m_dirty(false)
    , m_loaded(false)
{
}

Project::~Project() {
}

void Project::create(const std::string& name, const std::string& path) {
    m_name = name;
    m_path = path;
    m_scenePath = path + "/scene.kevla";
    m_assetsPath = path + "/assets";
    m_settingsPath = path + "/project.kevlaproj";
    m_dirty = false;
    m_loaded = true;
}

void Project::open(const std::string& path) {
    m_path = path;
    m_settingsPath = path + "/project.kevlaproj";
    m_scenePath = path + "/scene.kevla";
    m_assetsPath = path + "/assets";
    m_loaded = true;
    m_dirty = false;
}

void Project::save() {
    m_dirty = false;
}

void Project::saveAs(const std::string& path) {
    m_path = path;
    m_scenePath = path + "/scene.kevla";
    m_assetsPath = path + "/assets";
    m_settingsPath = path + "/project.kevlaproj";
    save();
}

void Project::close() {
    m_loaded = false;
    m_dirty = false;
}

void Project::setSetting(const std::string& key, const std::string& value) {
    m_settings[key] = value;
    m_dirty = true;
}

std::string Project::getSetting(const std::string& key, const std::string& defaultValue) const {
    auto it = m_settings.find(key);
    if (it != m_settings.end()) {
        return it->second;
    }
    return defaultValue;
}

// ============================================================
// ProjectManager Implementation
// ============================================================

ProjectManager::ProjectManager()
{
}

void ProjectManager::newProject(const std::string& name, const std::string& path) {
    m_currentProject = std::make_unique<Project>();
    m_currentProject->create(name, path);
    addRecentProject(path);
}

bool ProjectManager::openProject(const std::string& path) {
    m_currentProject = std::make_unique<Project>();
    m_currentProject->open(path);
    addRecentProject(path);
    return m_currentProject->isLoaded();
}

void ProjectManager::saveProject() {
    if (m_currentProject) {
        m_currentProject->save();
    }
}

void ProjectManager::closeProject() {
    if (m_currentProject) {
        m_currentProject->close();
        m_currentProject.reset();
    }
}

bool ProjectManager::hasUnsavedChanges() const {
    return m_currentProject && m_currentProject->isDirty();
}

std::vector<Project*> ProjectManager::getRecentProjects() const {
    std::vector<Project*> projects;
    (void)projects;
    return projects;
}

void ProjectManager::addRecentProject(const std::string& path) {
    m_recentProjects.erase(
        std::remove(m_recentProjects.begin(), m_recentProjects.end(), path),
        m_recentProjects.end()
    );
    
    m_recentProjects.insert(m_recentProjects.begin(), path);
    
    if (m_recentProjects.size() > m_maxRecent) {
        m_recentProjects.pop_back();
    }
}

void ProjectManager::createFromTemplate(const std::string& templateId, const std::string& name, const std::string& path) {
    (void)templateId;
    newProject(name, path);
}

} // namespace kevla
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <map>
#include <fstream>
#include "kevla/Types.h"

namespace kevla {

// ============================================================
// Serialization Format
// ============================================================

enum class SerializationFormat {
    Binary,
    JSON,
    XML
};

// ============================================================
// Serializable Interface
// ============================================================

class ISerializable {
public:
    virtual ~ISerializable() = default;
    virtual bool serialize(std::ostream& stream) const = 0;
    virtual bool deserialize(std::istream& stream) = 0;
};

// ============================================================
// Property Serialization
// ============================================================

struct Property {
    std::string name;
    std::string type;
    std::string value;
    
    template<typename T>
    T getValue() const;
    
    template<typename T>
    void setValue(const T& value);
};

// ============================================================
// Component Serialization
// ============================================================

class ComponentSerializer {
public:
    ComponentSerializer() = default;
    ~ComponentSerializer() = default;
    
    void registerSerializer(const std::string& componentType, 
                          std::function<bool(std::ostream&, class Component*)> serializeFn,
                          std::function<bool(std::istream&, class Component*)> deserializeFn);
    
    bool serializeComponent(std::ostream& stream, class Component* component) const;
    bool deserializeComponent(std::istream& stream, class Component* component) const;
    
private:
    struct SerializerFn {
        std::function<bool(std::ostream&, Component*)> serialize;
        std::function<bool(std::istream&, Component*)> deserialize;
    };
    
    std::map<std::string, SerializerFn> m_serializers;
};

// ============================================================
// Scene Serialization
// ============================================================

class SceneSerializer {
public:
    SceneSerializer();
    ~SceneSerializer() = default;
    
    void setFormat(SerializationFormat format) { m_format = format; }
    SerializationFormat getFormat() const { return m_format; }
    
    bool serializeScene(const class Scene& scene, const std::string& path);
    bool deserializeScene(class Scene& scene, const std::string& path);
    
    std::string serializeSceneToString(const class Scene& scene);
    bool deserializeSceneFromString(class Scene& scene, const std::string& data);
    
    // Options
    void setIncludeAssets(bool include) { m_includeAssets = include; }
    void setIncludeHistory(bool include) { m_includeHistory = true; }
    void setPrettyPrint(bool pretty) { m_prettyPrint = pretty; }
    void setCompression(bool compress) { m_compression = compress; }
    
private:
    bool serializeJSON(const class Scene& scene, std::ostream& stream);
    bool deserializeJSON(class Scene& scene, std::istream& stream);
    bool serializeBinary(const class Scene& scene, std::ostream& stream);
    bool deserializeBinary(class Scene& scene, std::istream& stream);
    
    SerializationFormat m_format = SerializationFormat::JSON;
    bool m_includeAssets = true;
    bool m_includeHistory = true;
    bool m_prettyPrint = true;
    bool m_compression = false;
};

// ============================================================
// Entity Serialization
// ============================================================

class EntitySerializer {
public:
    EntitySerializer();
    ~EntitySerializer() = default;
    
    bool serializeEntity(std::ostream& stream, class Entity* entity, int depth = 0);
    bool deserializeEntity(std::istream& stream, class Entity* entity);
    
    void setIncludeChildren(bool include) { m_includeChildren = include; }
    void setIncludeComponents(bool include) { m_includeComponents = true; }
    
private:
    void serializeTransform(std::ostream& stream, class Transform& transform, int depth);
    void serializeComponents(std::ostream& stream, class Entity* entity, int depth);
    void serializeChildren(std::ostream& stream, class Entity* entity, int depth);
    
    bool m_includeChildren = true;
    bool m_includeComponents = true;
};

// ============================================================
// Asset Reference
// ============================================================

struct AssetReference {
    std::string path;
    std::string type;
    std::string id;
    bool loaded = false;
    
    AssetReference() = default;
    AssetReference(const std::string& p, const std::string& t) : path(p), type(t) {}
};

// ============================================================
// Scene Snapshot
// ============================================================

class SceneSnapshot {
public:
    SceneSnapshot() = default;
    ~SceneSnapshot() = default;
    
    void capture(const class Scene& scene);
    void restore(class Scene& scene);
    
    std::string getData() const { return m_data; }
    void setData(const std::string& data) { m_data = data; }
    
    float getTimestamp() const { return m_timestamp; }
    const std::string& getName() const { return m_name; }
    void setName(const std::string& name) { m_name = name; }
    
private:
    std::string m_data;
    float m_timestamp = 0.0f;
    std::string m_name;
};

// ============================================================
// Scene History (Undo/Redo for scenes)
// ============================================================

class SceneHistory {
public:
    SceneHistory(size_t maxHistory = 50);
    ~SceneHistory() = default;
    
    void pushState(const SceneSnapshot& snapshot);
    bool undo(class Scene& scene);
    bool redo(class Scene& scene);
    
    bool canUndo() const { return m_undoStack.size() > 1; }
    bool canRedo() const { return m_redoStack.size() > 0; }
    
    const std::string& getUndoDescription() const;
    const std::string& getRedoDescription() const;
    
    void clear();
    
private:
    std::vector<SceneSnapshot> m_undoStack;
    std::vector<SceneSnapshot> m_redoStack;
    size_t m_maxHistory;
};

// ============================================================
// Project Manager
// ============================================================

class Project {
public:
    Project();
    ~Project();
    
    void create(const std::string& name, const std::string& path);
    void open(const std::string& path);
    void save();
    void saveAs(const std::string& path);
    void close();
    
    bool isDirty() const { return m_dirty; }
    void setDirty(bool dirty) { m_dirty = dirty; }
    
    std::string getName() const { return m_name; }
    std::string getPath() const { return m_path; }
    std::string getScenePath() const { return m_scenePath; }
    std::string getAssetsPath() const { return m_assetsPath; }
    
    void setCurrentScene(const std::string& path) { m_scenePath = path; m_dirty = true; }
    
    // Project settings
    void setSetting(const std::string& key, const std::string& value);
    std::string getSetting(const std::string& key, const std::string& defaultValue = "") const;
    
private:
    std::string m_name;
    std::string m_path;
    std::string m_scenePath;
    std::string m_assetsPath;
    std::string m_settingsPath;
    std::map<std::string, std::string> m_settings;
    bool m_dirty = false;
    bool m_loaded = false;
};

// ============================================================
// Project Manager
// ============================================================

class ProjectManager {
public:
    ProjectManager();
    ~ProjectManager() = default;
    
    Project* getCurrentProject() const { return m_currentProject.get(); }
    
    void newProject(const std::string& name, const std::string& path);
    bool openProject(const std::string& path);
    void saveProject();
    void closeProject();
    
    bool hasUnsavedChanges() const;
    
    std::vector<Project*> getRecentProjects() const;
    void addRecentProject(const std::string& path);
    
    // Project templates
    void createFromTemplate(const std::string& templateId, const std::string& name, const std::string& path);
    
private:
    std::unique_ptr<Project> m_currentProject;
    std::vector<std::string> m_recentProjects;
    size_t m_maxRecent = 10;
};

} // namespace kevla
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <fstream>
#include "kevla/render/Mesh.h"
#include "kevla/Vector.h"

namespace kevla {

// ============================================================
// Supported File Formats
// ============================================================

enum class AssetFormat {
    Unknown,
    OBJ,        // Wavefront OBJ
    GLTF,       // GL Transmission Format
    GLB,        // GL Binary
    FBX,        // Autodesk FBX (basic)
    KEVLA       // KEVLA native format
};

// ============================================================
// Import Options
// ============================================================

struct ImportOptions {
    bool calculateNormals = true;
    bool calculateTangents = true;
    bool flipUVs = false;
    bool flipFaces = false;
    bool importMaterials = true;
    bool importAnimations = true;
    float scale = 1.0f;
    bool centerGeometry = true;
    int maxBonesPerVertex = 4;
    bool generateLODs = false;
    int lodCount = 4;
    float lodReductionFactor = 0.5f;
};

// ============================================================
// Export Options
// ============================================================

struct ExportOptions {
    bool exportNormals = true;
    bool exportTangents = true;
    bool exportUVs = true;
    bool exportColors = true;
    bool exportMaterials = true;
    bool exportAnimations = true;
    bool exportSkinning = true;
    bool useRelativePaths = false;
    float scale = 1.0f;
    int precision = 6;
    bool optimizeMeshes = false;
};

// ============================================================
// Model Import Result
// ============================================================

struct ImportResult {
    bool success = false;
    std::string message;
    std::vector<Mesh*> meshes;
    std::string error;
};

// ============================================================
// Model Exporter
// ============================================================

class ModelExporter {
public:
    ModelExporter();
    ~ModelExporter() = default;
    
    bool exportToOBJ(Mesh* mesh, const std::string& path);
    bool exportToGLTF(Mesh* mesh, const std::string& path);
    bool exportToKEVLA(Mesh* mesh, const std::string& path);
    
    bool exportWithMaterials(Mesh* mesh, const std::string& path, AssetFormat format);
    bool exportWithAnimations(Mesh* mesh, const std::string& path, AssetFormat format);
    
private:
    std::string m_lastError;
};

// ============================================================
// Asset Manager - Import/Export hub
// ============================================================

class AssetManager {
public:
    AssetManager();
    ~AssetManager() = default;
    
    void initialize();
    void shutdown();
    
    // Import
    ImportResult importModel(const std::string& path, const ImportOptions& options = ImportOptions());
    ImportResult importMesh(const std::string& path, const ImportOptions& options = ImportOptions());
    
    // Export
    bool exportModel(Mesh* mesh, const std::string& path, AssetFormat format = AssetFormat::KEVLA, const ExportOptions& options = ExportOptions());
    bool exportMesh(Mesh* mesh, const std::string& path, AssetFormat format = AssetFormat::KEVLA);
    
    // Asset registry
    void registerAsset(const std::string& path, class Asset* asset);
    class Asset* getAsset(const std::string& path);
    void unloadAsset(const std::string& path);
    void unloadAll();
    
    // Path utilities
    static AssetFormat getFormat(const std::string& path);
    static std::string getExtension(const std::string& path);
    static std::string getFilename(const std::string& path);
    static std::string getDirectory(const std::string& path);
    
private:
    ImportResult importOBJ(const std::string& path, const ImportOptions& options);
    ImportResult importGLTF(const std::string& path, const ImportOptions& options);
    ImportResult importKEVLA(const std::string& path, const ImportOptions& options);
    
    bool exportOBJ(Mesh* mesh, const std::string& path, const ExportOptions& options);
    bool exportGLTF(Mesh* mesh, const std::string& path, const ExportOptions& options);
    bool exportKEVLA(Mesh* mesh, const std::string& path, const ExportOptions& options);
    
    std::unordered_map<std::string, class Asset*> m_loadedAssets;
    std::string m_assetsPath;
    bool m_initialized = false;
};

// ============================================================
// Asset (Base class)
// ============================================================

class Asset {
public:
    Asset() = default;
    virtual ~Asset() = default;
    
    virtual void load() = 0;
    virtual void unload() = 0;
    virtual bool isLoaded() const = 0;
    
    void setName(const std::string& name) { m_name = name; }
    const std::string& getName() const { return m_name; }
    
    void setPath(const std::string& path) { m_path = path; }
    const std::string& getPath() const { return m_path; }
    
protected:
    std::string m_name;
    std::string m_path;
    bool m_loaded = false;
};

// ============================================================
// Mesh Asset
// ============================================================

class MeshAsset : public Asset {
public:
    MeshAsset();
    ~MeshAsset() override;
    
    void load() override;
    void unload() override;
    bool isLoaded() const override { return m_loaded && m_mesh != nullptr; }
    
    Mesh* getMesh() const { return m_mesh.get(); }
    void setMesh(Mesh* mesh);
    
    void setSkeleton(class Skeleton* skeleton) { m_skeleton = skeleton; }
    class Skeleton* getSkeleton() const { return m_skeleton.get(); }
    
    void addAnimation(class Animation* animation);
    class Animation* getAnimation(const std::string& name);
    const std::vector<class Animation*>& getAnimations() const { return m_animations; }
    
private:
    std::unique_ptr<Mesh> m_mesh;
    std::unique_ptr<class Skeleton> m_skeleton;
    std::vector<class Animation*> m_animations;
};

} // namespace kevla
#include "kevla/assets/AssetManager.h"
#include "kevla/render/Mesh.h"
#include "kevla/Logger.h"
#include <sstream>
#include <algorithm>

namespace kevla {

// ============================================================
// ModelExporter Implementation
// ============================================================

ModelExporter::ModelExporter() {
}

bool ModelExporter::exportToOBJ(Mesh* mesh, const std::string& path) {
    if (!mesh) return false;
    
    std::ofstream file(path);
    if (!file.is_open()) {
        m_lastError = "Failed to open file: " + path;
        return false;
    }
    
    const auto& vertices = mesh->getVertices();
    const auto& indices = mesh->getIndices();
    
    file << "# KEVLA Engine OBJ Export\n";
    file << "# Vertices: " << vertices.size() << "\n";
    file << "# Faces: " << indices.size() / 3 << "\n\n";
    
    for (const auto& v : vertices) {
        file << "v " << v.position.x << " " << v.position.y << " " << v.position.z << "\n";
    }
    
    file << "\n";
    
    for (const auto& v : vertices) {
        file << "vt " << v.uv.x << " " << v.uv.y << "\n";
    }
    
    file << "\n";
    
    for (const auto& v : vertices) {
        file << "vn " << v.normal.x << " " << v.normal.y << " " << v.normal.z << "\n";
    }
    
    file << "\n";
    
    for (size_t i = 0; i < indices.size(); i += 3) {
        file << "f " << indices[i] + 1 << "/" << indices[i] + 1 << "/" << indices[i] + 1 << " "
             << indices[i + 1] + 1 << "/" << indices[i + 1] + 1 << "/" << indices[i + 1] + 1 << " "
             << indices[i + 2] + 1 << "/" << indices[i + 2] + 1 << "/" << indices[i + 2] + 1 << "\n";
    }
    
    return true;
}

bool ModelExporter::exportToGLTF(Mesh* mesh, const std::string& path) {
    (void)mesh;
    (void)path;
    return false;
}

bool ModelExporter::exportToKEVLA(Mesh* mesh, const std::string& path) {
    if (!mesh) return false;
    
    std::ofstream file(path, std::ios::binary);
    if (!file.is_open()) {
        m_lastError = "Failed to open file: " + path;
        return false;
    }
    
    const auto& vertices = mesh->getVertices();
    const auto& indices = mesh->getIndices();
    
    char magic[8] = "KEVLA001";
    file.write(magic, 8);
    
    uint32_t vertCount = (uint32_t)vertices.size();
    uint32_t indexCount = (uint32_t)indices.size();
    
    file.write((char*)&vertCount, sizeof(uint32_t));
    file.write((char*)&indexCount, sizeof(uint32_t));
    
    file.write((char*)vertices.data(), vertices.size() * sizeof(Vertex));
    file.write((char*)indices.data(), indices.size() * sizeof(uint32_t));
    
    return true;
}

bool ModelExporter::exportWithMaterials(Mesh* mesh, const std::string& path, AssetFormat format) {
    (void)mesh;
    (void)path;
    (void)format;
    return false;
}

bool ModelExporter::exportWithAnimations(Mesh* mesh, const std::string& path, AssetFormat format) {
    (void)mesh;
    (void)path;
    (void)format;
    return false;
}

// ============================================================
// AssetManager Implementation
// ============================================================

AssetManager::AssetManager()
    : m_initialized(false)
{
}

AssetManager::~AssetManager() {
    shutdown();
}

void AssetManager::initialize() {
    if (m_initialized) return;
    m_initialized = true;
    KEVLA_INFO("AssetManager initialized");
}

void AssetManager::shutdown() {
    if (!m_initialized) return;
    unloadAll();
    m_initialized = false;
}

ImportResult AssetManager::importModel(const std::string& path, const ImportOptions& options) {
    AssetFormat format = getFormat(path);
    
    switch (format) {
        case AssetFormat::OBJ:
            return importOBJ(path, options);
        case AssetFormat::GLTF:
        case AssetFormat::GLB:
            return importGLTF(path, options);
        case AssetFormat::KEVLA:
            return importKEVLA(path, options);
        default:
            ImportResult result;
            result.success = false;
            result.message = "Unsupported format";
            return result;
    }
}

ImportResult AssetManager::importMesh(const std::string& path, const ImportOptions& options) {
    return importModel(path, options);
}

ImportResult AssetManager::importOBJ(const std::string& path, const ImportOptions& options) {
    ImportResult result;
    
    std::ifstream file(path);
    if (!file.is_open()) {
        result.success = false;
        result.error = "Failed to open file: " + path;
        return result;
    }
    
    auto mesh = new Mesh();
    std::vector<Vertex> vertices;
    std::vector<uint32_t> indices;
    std::vector<Vector3> positions;
    std::vector<Vector2> uvs;
    std::vector<Vector3> normals;
    
    std::string line;
    while (std::getline(file, line)) {
        std::istringstream iss(line);
        std::string cmd;
        iss >> cmd;
        
        if (cmd == "v") {
            float x, y, z;
            iss >> x >> y >> z;
            positions.push_back({x, y, z});
        }
        else if (cmd == "vt") {
            float u, v;
            iss >> u >> v;
            uvs.push_back({u, v});
        }
        else if (cmd == "vn") {
            float x, y, z;
            iss >> x >> y >> z;
            normals.push_back({x, y, z});
        }
        else if (cmd == "f") {
            std::string v1, v2, v3;
            iss >> v1 >> v2 >> v3;
            
            auto parseFace = [](const std::string& s) -> int {
                size_t pos = s.find('/');
                if (pos != std::string::npos) {
                    return std::stoi(s.substr(0, pos)) - 1;
                }
                return std::stoi(s) - 1;
            };
            
            indices.push_back(parseFace(v1));
            indices.push_back(parseFace(v2));
            indices.push_back(parseFace(v3));
        }
    }
    
    for (size_t i = 0; i < positions.size(); i++) {
        Vertex v;
        v.position = positions[i];
        v.uv = (i < uvs.size()) ? uvs[i] : Vector2::Zero();
        v.normal = (i < normals.size()) ? normals[i] : Vector3::Up();
        v.color = {1, 1, 1, 1};
        vertices.push_back(v);
    }
    
    if (options.centerGeometry && !vertices.empty()) {
        Vector3 center = Vector3::Zero();
        for (const auto& v : vertices) {
            center += v.position;
        }
        center /= (float)vertices.size();
        
        for (auto& v : vertices) {
            v.position -= center;
        }
    }
    
    if (options.scale != 1.0f) {
        for (auto& v : vertices) {
            v.position *= options.scale;
        }
    }
    
    mesh->setVertices(vertices);
    mesh->setIndices(indices);
    
    if (options.calculateNormals) {
        mesh->calculateNormals();
    }
    
    result.success = true;
    result.message = "Import successful";
    result.meshes.push_back(mesh);
    
    return result;
}

ImportResult AssetManager::importGLTF(const std::string& path, const ImportOptions& options) {
    (void)path;
    (void)options;
    
    ImportResult result;
    result.success = false;
    result.message = "GLTF import not yet implemented";
    return result;
}

ImportResult AssetManager::importKEVLA(const std::string& path, const ImportOptions& options) {
    ImportResult result;
    
    std::ifstream file(path, std::ios::binary);
    if (!file.is_open()) {
        result.success = false;
        result.error = "Failed to open file: " + path;
        return result;
    }
    
    char magic[8];
    file.read(magic, 8);
    
    std::string magicStr(magic, 8);
    if (magicStr != "KEVLA001") {
        result.success = false;
        result.error = "Invalid KEVLA file format";
        return result;
    }
    
    auto mesh = new Mesh();
    
    uint32_t vertCount, indexCount;
    file.read((char*)&vertCount, sizeof(uint32_t));
    file.read((char*)&indexCount, sizeof(uint32_t));
    
    std::vector<Vertex> vertices(vertCount);
    std::vector<uint32_t> indices(indexCount);
    
    file.read((char*)vertices.data(), vertCount * sizeof(Vertex));
    file.read((char*)indices.data(), indexCount * sizeof(uint32_t));
    
    if (options.scale != 1.0f) {
        for (auto& v : vertices) {
            v.position *= options.scale;
        }
    }
    
    mesh->setVertices(vertices);
    mesh->setIndices(indices);
    
    result.success = true;
    result.message = "Import successful";
    result.meshes.push_back(mesh);
    
    return result;
}

bool AssetManager::exportModel(Mesh* mesh, const std::string& path, AssetFormat format, const ExportOptions& options) {
    switch (format) {
        case AssetFormat::OBJ:
            return exportOBJ(mesh, path, options);
        case AssetFormat::GLTF:
        case AssetFormat::GLB:
            return exportGLTF(mesh, path, options);
        case AssetFormat::KEVLA:
            return exportKEVLA(mesh, path, options);
        default:
            return false;
    }
}

bool AssetManager::exportMesh(Mesh* mesh, const std::string& path, AssetFormat format) {
    return exportModel(mesh, path, format, ExportOptions());
}

bool AssetManager::exportOBJ(Mesh* mesh, const std::string& path, const ExportOptions& options) {
    (void)options;
    ModelExporter exporter;
    return exporter.exportToOBJ(mesh, path);
}

bool AssetManager::exportGLTF(Mesh* mesh, const std::string& path, const ExportOptions& options) {
    (void)options;
    ModelExporter exporter;
    return exporter.exportToGLTF(mesh, path);
}

bool AssetManager::exportKEVLA(Mesh* mesh, const std::string& path, const ExportOptions& options) {
    (void)options;
    ModelExporter exporter;
    return exporter.exportToKEVLA(mesh, path);
}

void AssetManager::registerAsset(const std::string& path, Asset* asset) {
    m_loadedAssets[path] = asset;
}

Asset* AssetManager::getAsset(const std::string& path) {
    auto it = m_loadedAssets.find(path);
    if (it != m_loadedAssets.end()) {
        return it->second;
    }
    return nullptr;
}

void AssetManager::unloadAsset(const std::string& path) {
    auto it = m_loadedAssets.find(path);
    if (it != m_loadedAssets.end()) {
        it->second->unload();
        delete it->second;
        m_loadedAssets.erase(it);
    }
}

void AssetManager::unloadAll() {
    for (auto& [path, asset] : m_loadedAssets) {
        asset->unload();
        delete asset;
    }
    m_loadedAssets.clear();
}

AssetFormat AssetManager::getFormat(const std::string& path) {
    std::string ext = getExtension(path);
    std::transform(ext.begin(), ext.end(), ext.begin(), ::tolower);
    
    if (ext == "obj") return AssetFormat::OBJ;
    if (ext == "gltf") return AssetFormat::GLTF;
    if (ext == "glb") return AssetFormat::GLB;
    if (ext == "fbx") return AssetFormat::FBX;
    if (ext == "kevla") return AssetFormat::KEVLA;
    
    return AssetFormat::Unknown;
}

std::string AssetManager::getExtension(const std::string& path) {
    size_t pos = path.find_last_of('.');
    if (pos != std::string::npos) {
        return path.substr(pos + 1);
    }
    return "";
}

std::string AssetManager::getFilename(const std::string& path) {
    size_t pos = path.find_last_of("/\\");
    if (pos != std::string::npos) {
        return path.substr(pos + 1);
    }
    return path;
}

std::string AssetManager::getDirectory(const std::string& path) {
    size_t pos = path.find_last_of("/\\");
    if (pos != std::string::npos) {
        return path.substr(0, pos);
    }
    return "";
}

// ============================================================
// MeshAsset Implementation
// ============================================================

MeshAsset::MeshAsset() {
}

MeshAsset::~MeshAsset() {
    for (auto* anim : m_animations) {
        delete anim;
    }
    m_animations.clear();
}

void MeshAsset::load() {
    m_loaded = true;
}

void MeshAsset::unload() {
    m_loaded = false;
}

void MeshAsset::setMesh(Mesh* mesh) {
    m_mesh.reset(mesh);
    m_loaded = true;
}

void MeshAsset::addAnimation(Animation* animation) {
    m_animations.push_back(animation);
}

Animation* MeshAsset::getAnimation(const std::string& name) {
    for (auto* anim : m_animations) {
        if (anim->getName() == name) {
            return anim;
        }
    }
    return nullptr;
}

} // namespace kevla
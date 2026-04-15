#pragma once

#include <vector>
#include <map>
#include <memory>
#include <array>
#include <thread>
#include <atomic>
#include <mutex>
#include <future>
#include "kevla/Vector.h"
#include "kevla/render/Mesh.h"

namespace kevla {

// ============================================================
// Signed Distance Field (SDF) - True Volumetric Clay
// ============================================================

constexpr int CHUNK_SIZE = 32;
constexpr int VOXEL_RES = 64;
constexpr float VOXEL_SIZE = 0.05f;

struct ClayMaterial {
    float hardness = 1.0f;
    float plasticity = 0.5f;
    float viscosity = 0.3f;
    Vector3 color = {0.75f, 0.55f, 0.4f};
    float subsurface = 0.0f;
};

// ============================================================
// SDF Functions (Mathematical primitives)
// ============================================================

struct SDFPrimitive {
    enum class Type {
        Sphere,
        Box,
        Cylinder,
        Torus,
        Capsule,
        Union,
        Subtraction,
        Intersection,
        SmoothUnion,
        SmoothSubtraction,
    };
    
    Type type = Type::Sphere;
    Vector3 position = Vector3::Zero();
    Vector3 size = Vector3::One();
    float radius = 1.0f;
    float smoothness = 0.5f;
};

// ============================================================
// Voxel Data for SDF Field
// ============================================================

struct ClayVoxel {
    float density = 0.0f;
    float temperature = 0.0f;
    Vector3 velocity = Vector3::Zero();
    Vector3 normal = Vector3::Up();
    Vector3 color = {0.75f, 0.55f, 0.4f};
    bool dirty = false;
};

// ============================================================
// Octree Node for Adaptive Resolution
// ============================================================

struct OctreeNode {
    std::array<std::unique_ptr<OctreeNode>, 8> children;
    Vector3 center;
    float halfSize;
    float minDensity = 0.0f;
    float maxDensity = 0.0f;
    bool subdivided = false;
    std::vector<uint32_t> triangles;
    
    bool isLeaf() const { return !subdivided; }
};

// ============================================================
// Chunk for Large-Scale Sculpting
// ============================================================

struct ChunkCoord {
    int x, y, z;
    
    bool operator<(const ChunkCoord& other) const {
        if (x != other.x) return x < other.x;
        if (y != other.y) return y < other.y;
        return z < other.z;
    }
};

class ClayChunk {
public:
    ClayChunk(const ChunkCoord& coord);
    ~ClayChunk();
    
    void initialize();
    void setVoxel(int x, int y, int z, float density);
    float getVoxel(int x, int y, int z) const;
    Vector3 getGradient(int x, int y, int z) const;
    
    void markDirty() { m_dirty = true; }
    bool isDirty() const { return m_dirty; }
    void clearDirty() { m_dirty = false; }
    
    ChunkCoord getCoord() const { return m_coord; }
    Mesh* getMesh() { return m_mesh.get(); }
    
    void generateMesh();
    void updateRegion(int px, int py, int pz, int radius);
    
private:
    void marchCubes();
    float interpolate(float d1, float d2) const;
    Vector3 getVertex(float d0, float d1, float d2, float d3, 
                      const Vector3& v0, const Vector3& v1, 
                      const Vector3& v2, const Vector3& v3) const;
    
    ChunkCoord m_coord;
    std::vector<ClayVoxel> m_voxels;
    std::unique_ptr<Mesh> m_mesh;
    bool m_dirty = true;
    
    static constexpr int RES = CHUNK_SIZE;
};

// ============================================================
// Clay Brush Types (True clay interaction)
// ============================================================

enum class ClayBrushType {
    Add,           // Add clay material
    Remove,        // Remove clay material
    Smooth,        // Smooth like real clay
    Grab,          // Grab and pull clay
    Inflate,       // Inflate/blow air
    Pinch,         // Pinch and compress
    Flatten,       // Flatten surface
    Scrape,        // Scrape/sculpt detail
    Clay,          // Add with clay consistency
    Polish,        // Polish surface
    Bend,          // Bend deformation
    Twist,         // Twist deformation
    Undo,          // Undo last stroke
    Mask,          // Paint mask
};

struct ClayBrush {
    ClayBrushType type = ClayBrushType::Add;
    float radius = 1.0f;
    float strength = 0.5f;
    float falloff = 2.0f;
    float detail = 0.5f;
    float pinch = 0.0f;
    float curve = 0.5f;
    bool autoNormal = true;
    float height = 0.0f;
    int mirrorAxis = -1;
    Vector3 direction = Vector3::Zero();
    
    float clayHardness = 1.0f;
    float plasticity = 0.5f;
};

// ============================================================
// Stroke for continuous sculpting
// ============================================================

struct ClayStroke {
    std::vector<Vector3> points;
    std::vector<Vector3> normals;
    std::vector<float> pressures;
    std::vector<float> timestamps;
    
    void addPoint(const Vector3& pos, const Vector3& normal, float pressure) {
        points.push_back(pos);
        normals.push_back(normal);
        pressures.push_back(pressure);
        timestamps.push_back(0.0f);
    }
    
    void clear() {
        points.clear();
        normals.clear();
        pressures.clear();
        timestamps.clear();
    }
    
    bool empty() const { return points.empty(); }
    size_t size() const { return points.size(); }
};

// ============================================================
// Main Clay Sculpting System
// ============================================================

class ClaySculptSystem {
public:
    ClaySculptSystem();
    ~ClaySculptSystem();
    
    void initialize(int worldSize = 512);
    void shutdown();
    
    void setBrush(const ClayBrush& brush);
    const ClayBrush& getBrush() const { return m_brush; }
    
    void beginStroke(const Vector3& position, const Vector3& normal, float pressure = 1.0f);
    void updateStroke(const Vector3& position, const Vector3& normal, float pressure = 1.0f);
    void endStroke();
    
    void applyBrushToSDF(const Vector3& position, const Vector3& normal, float pressure);
    
    void setTool(ClayBrushType type);
    ClayBrushType getTool() const { return m_brush.type; }
    
    void setBrushRadius(float radius) { m_brush.radius = radius; }
    void setBrushStrength(float strength) { m_brush.strength = strength; }
    
    void setMaterial(const ClayMaterial& material);
    const ClayMaterial& getMaterial() const { return m_material; }
    
    void addChunk(const ChunkCoord& coord);
    void removeChunk(const ChunkCoord& coord);
    ClayChunk* getChunk(const ChunkCoord& coord);
    
    void setActiveChunk(const ChunkCoord& coord);
    ChunkCoord getActiveChunk() const { return m_activeChunk; }
    
    Mesh* getRenderMesh();
    
    void setGravity(bool enabled, float strength = 9.8f);
    void update(float deltaTime);
    
    void exportToMesh(Mesh* mesh);
    void importFromMesh(Mesh* mesh);
    
    void optimizeMemory();
    void rebuildAllChunks();
    
private:
    float sampleSDF(const Vector3& position) const;
    Vector3 calculateNormal(const Vector3& position) const;
    
    void applyAddClay(const Vector3& center, float radius, float strength, float pressure);
    void applyRemoveClay(const Vector3& center, float radius, float strength, float pressure);
    void applySmoothClay(const Vector3& center, float radius, float strength);
    void applyGrabClay(const Vector3& center, const Vector3& delta, float radius, float strength);
    void applyInflate(const Vector3& center, float radius, float strength);
    void applyPinch(const Vector3& center, float radius, float strength);
    void applyFlatten(const Vector3& center, const Vector3& normal, float radius, float strength);
    void applyScrape(const Vector3& center, const Vector3& normal, float radius, float strength);
    
    float calculateFalloff(float distance, float radius, float curve) const;
    
    void markAffectedChunks(const Vector3& center, float radius);
    void updateDirtyChunks();
    
    ClayBrush m_brush;
    ClayMaterial m_material;
    ClayStroke m_stroke;
    
    std::map<ChunkCoord, std::unique_ptr<ClayChunk>> m_chunks;
    ChunkCoord m_activeChunk = {0, 0, 0};
    
    bool m_gravityEnabled = false;
    float m_gravityStrength = 9.8f;
    
    std::vector<std::future<void>> m_pendingMeshUpdates;
    std::mutex m_chunkMutex;
    
    bool m_initialized = false;
    int m_worldSize = 512;
};

// ============================================================
// GPU-Accelerated Mesh Generator
// ============================================================

class MeshGenerator {
public:
    MeshGenerator();
    ~MeshGenerator() = default;
    
    void initialize(int maxThreads = 4);
    
    std::future<Mesh*> generateMeshAsync(const ClayChunk* chunk);
    Mesh* generateMesh(const ClayChunk* chunk);
    
    void setMaxThreads(int count) { m_maxThreads = count; }
    
private:
    void generateMeshInternal(const ClayChunk* chunk, Mesh* mesh);
    
    int m_maxThreads = 4;
    std::atomic<int> m_activeThreads{0};
};

// ============================================================
// Adaptive LOD System
// ============================================================

class AdaptiveLOD {
public:
    AdaptiveLOD();
    ~AdaptiveLOD() = default;
    
    void initialize(int baseRes, int maxLevels);
    
    float getDetailLevel(const Vector3& cameraPos, const Vector3& objectPos, float objectRadius);
    
    void setBaseResolution(int res) { m_baseRes = res; }
    void setDistanceFalloff(float falloff) { m_distanceFalloff = falloff; }
    
private:
    int m_baseRes = 64;
    int m_maxLevels = 4;
    float m_distanceFalloff = 100.0f;
};

// ============================================================
// Clay Simulation (Physics-aware deformation)
// ============================================================

class ClaySimulation {
public:
    ClaySimulation();
    ~ClaySimulation() = default;
    
    void initialize();
    void shutdown();
    
    void setGravity(float strength);
    void setPlasticity(float plasticity) { m_plasticity = plasticity; }
    void setViscosity(float viscosity) { m_viscosity = viscosity; }
    
    void applyForce(const Vector3& position, const Vector3& force, float radius);
    void update(float deltaTime);
    
    bool isStable() const { return m_stable; }
    
private:
    float m_gravity = 9.8f;
    float m_plasticity = 0.5f;
    float m_viscosity = 0.3f;
    bool m_stable = true;
    
    std::vector<Vector3> m_velocities;
    std::vector<float> m_densities;
};

} // namespace kevla

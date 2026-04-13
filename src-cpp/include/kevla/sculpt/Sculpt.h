#pragma once

#include <vector>
#include <map>
#include <memory>
#include "kevla/Vector.h"
#include "kevla/render/Mesh.h"

namespace kevla {

// ============================================================
// Sculpt Tool Types
// ============================================================

enum class SculptToolType {
    Draw,           // Add clay
    Erase,          // Remove clay
    Smooth,         // Smooth surface
    Flatten,        // Flatten to plane
    Grab,           // Pull vertices
    GrabNormal,     // Pull along normal
    Pinch,          // Pinch surface
    Snake,          // Snake/worm tool
    Clay,           // Add clay with consistency
    Trim,           // Trim/cut
    PlaneCut,       // Cut with plane
    Mask,           // Paint mask
    MaskClear,      // Clear mask
    Annotate,       // Draw strokes
    View,           // View manipulation
    Rotate,         // Rotate
    Scale,          // Scale
    GrabSet,        // Grab entire mesh
    Mirror,         // Mirror editing
    Duplicate,      // Duplicate
    Decimate,       // Reduce polygon count
    Rebuild,        // Rebuild topology
};

// ============================================================
// Sculpt Brush Settings
// ============================================================

struct SculptBrush {
    SculptToolType type = SculptToolType::Draw;
    float radius = 1.0f;
    float strength = 0.5f;
    float detail = 0.5f;
    bool autoNormal = true;
    float autoNormalFactor = 0.0f;
    bool preserveUVs = true;
    bool useAccurateStroke = false;
    float planeOffset = 0.0f;
    float height = 0.0f;
    float direction = 1.0f;
    int mirrorAxis = -1;
    float pinchStrength = 0.5f;
    float smoothStrength = 0.5f;
    float flattenStrength = 0.5f;
    float snakeHookFactor = 0.0f;
    float sculptRemapSize = 0.0f;
    int deformTargetIndex = -1;
    bool locked = false;
    
    Vector3 color = {0.8f, 0.6f, 0.4f};
    bool showCursor = true;
    bool cursor3D = true;
};

// ============================================================
// Sculpt Stroke
// ============================================================

struct SculptStroke {
    std::vector<Vector3> points;
    std::vector<float> pressures;
    float currentStrength = 1.0f;
    int activeVertexCount = 0;
    bool isDragging = false;
    bool isGrabbing = false;
};

// ============================================================
// Sculpt Face Set
// ============================================================

struct FaceSet {
    std::vector<int> faces;
    int colorIndex = 0;
};

// ============================================================
// Sculpt Mesh Data
// ============================================================

struct SculptVertex {
    Vector3 position;
    Vector3 normal;
    Vector2 uv;
    int originalIndex = -1;
    float sculptCurrentNormal[3] = {0, 1, 0};
    float mask = 0.0f;
    int neighborCount = 0;
    bool dirty = false;
};

struct SculptMesh {
    std::vector<SculptVertex> vertices;
    std::vector<int> faces;
    int maxFaceSetIndex = 0;
    
    std::vector<FaceSet> faceSets;
    std::vector<bool> faceSetVisibility;
    
    bool hasDynamicTopology = false;
    std::vector<int> dynTopoFaceMap;
};

// ============================================================
// Voxel Data
// ============================================================

struct Voxel {
    uint8_t r = 128;
    uint8_t g = 128;
    uint8_t b = 128;
    uint8_t a = 255;
    bool active = false;
};

struct VoxelData {
    int size = 64;
    float scale = 0.1f;
    std::vector<Voxel> voxels;
    Vector3 position;
};

// ============================================================
// Sculpt Layer
// ============================================================

class SculptLayer {
public:
    SculptLayer(const std::string& name = "Layer");
    ~SculptLayer() = default;
    
    void setName(const std::string& name) { m_name = name; }
    const std::string& getName() const { return m_name; }
    
    void setVisible(bool visible) { m_visible = visible; }
    bool isVisible() const { return m_visible; }
    
    void setOpacity(float opacity) { m_opacity = opacity; }
    float getOpacity() const { return m_opacity; }
    
    void setLocked(bool locked) { m_locked = locked; }
    bool isLocked() const { return m_locked; }
    
    std::vector<float>& getDisplacements() { return m_displacements; }
    
private:
    std::string m_name;
    bool m_visible = true;
    float m_opacity = 1.0f;
    bool m_locked = false;
    std::vector<float> m_displacements;
};

// ============================================================
// Symmetry Settings
// ============================================================

struct SculptSymmetry {
    bool mirrorX = true;
    bool mirrorY = false;
    bool mirrorZ = false;
    int mirrorAxis = 0;
    float symmetryRadius = 10.0f;
    bool useSymmetryPassthrough = false;
    int activeSymmetry = 0;
};

// ============================================================
// Main Sculpt System
// ============================================================

class SculptSystem {
public:
    SculptSystem();
    ~SculptSystem();
    
    void initialize();
    void shutdown();
    
    // Mesh management
    void setMesh(Mesh* mesh);
    Mesh* getMesh() const { return m_mesh; }
    
    void clearMesh();
    void initFromMesh(Mesh* mesh);
    
    // Tool operations
    void setTool(SculptToolType tool);
    SculptToolType getTool() const { return m_brush.type; }
    
    void setBrushRadius(float radius) { m_brush.radius = radius; }
    void setBrushStrength(float strength) { m_brush.strength = strength; }
    
    // Sculpting
    void beginStroke(const Vector3& position, float pressure = 1.0f);
    void updateStroke(const Vector3& position, float pressure = 1.0f);
    void endStroke();
    
    // Voxel sculpting
    void voxelize();
    void addVoxel(const Vector3& position);
    void removeVoxel(const Vector3& position);
    void sculptVoxel(const Vector3& position, float strength);
    
    // Layers
    void addLayer(const std::string& name);
    void removeLayer(int index);
    void setActiveLayer(int index);
    int getActiveLayer() const { return m_activeLayer; }
    SculptLayer* getLayer(int index);
    
    // Symmetry
    void setSymmetryX(bool enabled) { m_symmetry.mirrorX = enabled; }
    void setSymmetryY(bool enabled) { m_symmetry.mirrorY = enabled; }
    void setSymmetryZ(bool enabled) { m_symmetry.mirrorZ = enabled; }
    
    // Dynamic topology
    void enableDynamicTopology(bool enable);
    void subdivide();
    void decimate(float ratio);
    
    // Visuals
    void render(class Renderer* renderer);
    Mesh* getRenderMesh();
    
    // Export
    Mesh* exportAsMesh();
    
private:
    void applyBrush(const Vector3& position, float strength);
    void calculateNormals();
    void updateRenderMesh();
    void handleSymmetry(Vector3& position);
    
    Mesh* m_mesh = nullptr;
    std::unique_ptr<SculptMesh> m_sculptMesh;
    
    SculptBrush m_brush;
    SculptStroke m_stroke;
    SculptSymmetry m_symmetry;
    
    std::vector<std::unique_ptr<SculptLayer>> m_layers;
    int m_activeLayer = 0;
    
    bool m_dynamicTopology = false;
    bool m_initialized = false;
    
    std::unique_ptr<class VoxelGrid> m_voxelGrid;
};

// ============================================================
// Voxel Grid
// ============================================================

class VoxelGrid {
public:
    VoxelGrid();
    ~VoxelGrid() = default;
    
    void initialize(int size, float scale);
    
    Voxel* getVoxel(int x, int y, int z);
    void setVoxel(int x, int y, int z, const Voxel& voxel);
    
    void addSphere(const Vector3& center, float radius);
    void subtractSphere(const Vector3& center, float radius);
    void smoothSphere(const Vector3& center, float radius);
    
    int getSize() const { return m_size; }
    float getScale() const { return m_scale; }
    
    Mesh* generateMesh();
    
private:
    int m_size = 64;
    float m_scale = 0.1f;
    std::vector<Voxel> m_voxels;
    
    int getIndex(int x, int y, int z) const;
    bool isValid(int x, int y, int z) const;
};

// ============================================================
// Voxel Sculpt Tool
// ============================================================

class VoxelSculptTool {
public:
    VoxelSculptTool();
    ~VoxelSculptTool() = default;
    
    void setMode(SculptToolType mode) { m_mode = mode; }
    void setBrushSize(float size) { m_brushSize = size; }
    void setBrushStrength(float strength) { m_brushStrength = strength; }
    
    void apply(VoxelGrid* grid, const Vector3& position);
    
private:
    SculptToolType m_mode = SculptToolType::Draw;
    float m_brushSize = 1.0f;
    float m_brushStrength = 0.5f;
};

} // namespace kevla
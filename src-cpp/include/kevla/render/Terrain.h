#pragma once

#include <vector>
#include <string>
#include "kevla/Types.h"
#include "kevla/Vector.h"

namespace kevla {

// ============================================================
// Terrain System
// ============================================================

struct TerrainConfig {
    int resolution = 128;
    float size = 100.0f;
    float heightScale = 10.0f;
    int octaves = 4;
    float persistence = 0.5f;
    float lacunarity = 2.0f;
    float scale = 0.02f;
    std::string materialId;
};

class Terrain {
public:
    Terrain();
    ~Terrain();
    
    void generate(const TerrainConfig& config);
    void regenerate();
    
    // Height manipulation
    float getHeight(float x, float z) const;
    void setHeight(float x, float z, float height);
    void addHeight(float x, float z, float amount);
    void smooth(float x, float z, float radius);
    void flatten(float x, float z, float height, float radius);
    
    // Terrain data
    const std::vector<float>& getHeightmap() const { return m_heightmap; }
    int getResolution() const { return m_resolution; }
    float getSize() const { return m_size; }
    
    // Collision
    void updateCollisionMesh();
    
    // Export/Import
    void exportHeightmap(const std::string& path);
    void importHeightmap(const std::string& path);
    
private:
    float noise(float x, float z) const;
    float fbm(float x, float z) const;
    
    int m_resolution = 128;
    float m_size = 100.0f;
    float m_heightScale = 10.0f;
    std::vector<float> m_heightmap;
    
    TerrainConfig m_config;
};

// ============================================================
// Terrain Brush
// ============================================================

enum class BrushType {
    Add,
    Subtract,
    Smooth,
    Flatten,
    Noise,
    Paint
};

enum class BrushShape {
    Circle,
    Square
};

class TerrainBrush {
public:
    TerrainBrush();
    
    void setType(BrushType type) { m_type = type; }
    void setShape(BrushShape shape) { m_shape = shape; }
    void setRadius(float radius) { m_radius = radius; }
    void setStrength(float strength) { m_strength = strength; }
    void setMaterial(int materialIndex) { m_materialIndex = materialIndex; }
    
    void apply(Terrain* terrain, float x, float z);
    
private:
    BrushType m_type = BrushType::Add;
    BrushType m_shape = BrushType::Circle;
    float m_radius = 2.0f;
    float m_strength = 1.0f;
    int m_materialIndex = 0;
};

// ============================================================
// Terrain Layer (texture)
// ============================================================

struct TerrainLayer {
    std::string name;
    std::string diffuseMap;
    std::string normalMap;
    float tileScale = 10.0f;
    float threshold = 0.0f;
    float hardness = 1.0f;
};

// ============================================================
// Terrain Editor
// ============================================================

class TerrainEditor {
public:
    TerrainEditor();
    ~TerrainEditor();
    
    void initialize();
    void shutdown();
    
    void update(float deltaTime);
    void render(class Renderer* renderer);
    
    Terrain* getTerrain() const { return m_terrain.get(); }
    void setTerrain(Terrain* terrain);
    
    void selectBrush(BrushType type);
    void setBrushRadius(float radius);
    void setBrushStrength(float strength);
    
    void addLayer(const TerrainLayer& layer);
    void removeLayer(int index);
    void setLayerBlend(int index, float blend);
    
    void applyBrush(float worldX, float worldZ);
    
    // Terrain settings
    void setResolution(int res);
    void setSize(float size);
    void setHeightScale(float scale);
    void regenerate();
    
private:
    std::unique_ptr<Terrain> m_terrain;
    TerrainBrush m_brush;
    std::vector<TerrainLayer> m_layers;
    
    bool m_enabled = true;
    bool m_showWireframe = false;
    int m_selectedLayer = 0;
};

} // namespace kevla
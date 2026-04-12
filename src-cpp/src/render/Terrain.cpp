#include "kevla/render/Terrain.h"
#include <cmath>
#include <random>
#include <fstream>

namespace kevla {

// ============================================================
// Terrain Implementation
// ============================================================

Terrain::Terrain()
    : m_resolution(128)
    , m_size(100.0f)
    , m_heightScale(10.0f)
{
}

Terrain::~Terrain() {
}

void Terrain::generate(const TerrainConfig& config) {
    m_config = config;
    m_resolution = config.resolution;
    m_size = config.size;
    m_heightScale = config.heightScale;
    
    m_heightmap.resize(m_resolution * m_resolution);
    
    for (int z = 0; z < m_resolution; z++) {
        for (int x = 0; x < m_resolution; x++) {
            float nx = (float)x / m_resolution;
            float nz = (float)z / m_resolution;
            float height = fbm(nx * config.scale * 10.0f, nz * config.scale * 10.0f);
            m_heightmap[z * m_resolution + x] = height * m_heightScale;
        }
    }
}

void Terrain::regenerate() {
    generate(m_config);
}

float Terrain::getHeight(float x, float z) const {
    float halfSize = m_size / 2.0f;
    
    if (x < -halfSize || x > halfSize || z < -halfSize || z > halfSize) {
        return 0.0f;
    }
    
    float normalizedX = (x + halfSize) / m_size;
    float normalizedZ = (z + halfSize) / m_size;
    
    int x0 = (int)(normalizedX * m_resolution);
    int z0 = (int)(normalizedZ * m_resolution);
    int x1 = std::min(x0 + 1, m_resolution - 1);
    int z1 = std::min(z0 + 1, m_resolution - 1);
    
    float fx = normalizedX * m_resolution - x0;
    float fz = normalizedZ * m_resolution - z0;
    
    float h00 = m_heightmap[z0 * m_resolution + x0];
    float h10 = m_heightmap[z0 * m_resolution + x1];
    float h01 = m_heightmap[z1 * m_resolution + x0];
    float h11 = m_heightmap[z1 * m_resolution + x1];
    
    float h0 = h00 * (1.0f - fx) + h10 * fx;
    float h1 = h01 * (1.0f - fx) + h11 * fx;
    
    return h0 * (1.0f - fz) + h1 * fz;
}

void Terrain::setHeight(float x, float z, float height) {
    float halfSize = m_size / 2.0f;
    
    if (x < -halfSize || x > halfSize || z < -halfSize || z > halfSize) {
        return;
    }
    
    int ix = (int)((x + halfSize) / m_size * m_resolution);
    int iz = (int)((z + halfSize) / m_size * m_resolution);
    
    if (ix >= 0 && ix < m_resolution && iz >= 0 && iz < m_resolution) {
        m_heightmap[iz * m_resolution + ix] = height;
    }
}

void Terrain::addHeight(float x, float z, float amount) {
    float h = getHeight(x, z);
    setHeight(x, z, h + amount);
}

void Terrain::smooth(float x, float z, float radius) {
    float halfSize = m_size / 2.0f;
    
    int ix = (int)((x + halfSize) / m_size * m_resolution);
    int iz = (int)((z + halfSize) / m_size * m_resolution);
    int ir = (int)(radius / m_size * m_resolution);
    
    float sum = 0.0f;
    float count = 0.0f;
    
    for (int dz = -ir; dz <= ir; dz++) {
        for (int dx = -ir; dx <= ir; dx++) {
            int sx = ix + dx;
            int sz = iz + dz;
            
            if (sx >= 0 && sx < m_resolution && sz >= 0 && sz < m_resolution) {
                sum += m_heightmap[sz * m_resolution + sx];
                count += 1.0f;
            }
        }
    }
    
    if (count > 0.0f) {
        float avg = sum / count;
        for (int dz = -ir; dz <= ir; dz++) {
            for (int dx = -ir; dx <= ir; dx++) {
                int sx = ix + dx;
                int sz = iz + dz;
                
                if (sx >= 0 && sx < m_resolution && sz >= 0 && sz < m_resolution) {
                    float current = m_heightmap[sz * m_resolution + sx];
                    m_heightmap[sz * m_resolution + sx] = current + (avg - current) * 0.5f;
                }
            }
        }
    }
}

void Terrain::flatten(float x, float z, float height, float radius) {
    (void)x;
    (void)z;
    (void)height;
    (void)radius;
}

void Terrain::updateCollisionMesh() {
}

void Terrain::exportHeightmap(const std::string& path) {
    std::ofstream file(path, std::ios::binary);
    if (file.is_open()) {
        file.write((char*)&m_resolution, sizeof(int));
        file.write((char*)m_heightmap.data(), m_heightmap.size() * sizeof(float));
    }
}

void Terrain::importHeightmap(const std::string& path) {
    std::ifstream file(path, std::ios::binary);
    if (file.is_open()) {
        file.read((char*)&m_resolution, sizeof(int));
        m_heightmap.resize(m_resolution * m_resolution);
        file.read((char*)m_heightmap.data(), m_heightmap.size() * sizeof(float));
    }
}

float Terrain::noise(float x, float z) const {
    static std::default_random_engine engine;
    static std::uniform_real_distribution<float> dist(0.0f, 1.0f);
    
    float xi = std::floor(x);
    float zi = std::floor(z);
    
    float xf = x - xi;
    float zf = z - zi;
    
    float a = dist(engine);
    float b = dist(engine);
    float c = dist(engine);
    float d = dist(engine);
    
    float t = xf * (1.0f - xf) * zf * (1.0f - zf);
    
    return a * t + b * t + c * t + d * t;
}

float Terrain::fbm(float x, float z) const {
    float value = 0.0f;
    float amplitude = 1.0f;
    float frequency = 1.0f;
    float maxValue = 0.0f;
    
    for (int i = 0; i < m_config.octaves; i++) {
        value += amplitude * noise(x * frequency, z * frequency);
        maxValue += amplitude;
        amplitude *= m_config.persistence;
        frequency *= m_config.lacunarity;
    }
    
    return value / maxValue;
}

// ============================================================
// Terrain Brush Implementation
// ============================================================

TerrainBrush::TerrainBrush()
    : m_type(BrushType::Add)
    , m_shape(BrushType::Circle)
    , m_radius(2.0f)
    , m_strength(1.0f)
    , m_materialIndex(0)
{
}

void TerrainBrush::apply(Terrain* terrain, float x, float z) {
    if (!terrain) return;
    
    switch (m_type) {
        case BrushType::Add:
            terrain->addHeight(x, z, m_strength * 0.1f);
            break;
        case BrushType::Subtract:
            terrain->addHeight(x, z, -m_strength * 0.1f);
            break;
        case BrushType::Smooth:
            terrain->smooth(x, z, m_radius);
            break;
        case BrushType::Flatten:
            terrain->flatten(x, z, terrain->getHeight(x, z), m_radius);
            break;
        default:
            break;
    }
}

// ============================================================
// Terrain Editor Implementation
// ============================================================

TerrainEditor::TerrainEditor()
    : m_enabled(true)
    , m_showWireframe(false)
    , m_selectedLayer(0)
{
}

TerrainEditor::~TerrainEditor() {
    shutdown();
}

void TerrainEditor::initialize() {
    m_terrain = std::make_unique<Terrain>();
}

void TerrainEditor::shutdown() {
    m_terrain.reset();
}

void TerrainEditor::update(float deltaTime) {
    (void)deltaTime;
}

void TerrainEditor::render(class Renderer* renderer) {
    (void)renderer;
}

void TerrainEditor::setTerrain(Terrain* terrain) {
    m_terrain.reset(terrain);
}

void TerrainEditor::selectBrush(BrushType type) {
    m_brush.setType(type);
}

void TerrainEditor::setBrushRadius(float radius) {
    m_brush.setRadius(radius);
}

void TerrainEditor::setBrushStrength(float strength) {
    m_brush.setStrength(strength);
}

void TerrainEditor::addLayer(const TerrainLayer& layer) {
    m_layers.push_back(layer);
}

void TerrainEditor::removeLayer(int index) {
    if (index >= 0 && index < (int)m_layers.size()) {
        m_layers.erase(m_layers.begin() + index);
    }
}

void TerrainEditor::setLayerBlend(int index, float blend) {
    (void)index;
    (void)blend;
}

void TerrainEditor::applyBrush(float worldX, float worldZ) {
    m_brush.apply(m_terrain.get(), worldX, worldZ);
}

void TerrainEditor::setResolution(int res) {
    if (m_terrain) {
        m_terrain->m_resolution = res;
    }
}

void TerrainEditor::setSize(float size) {
    if (m_terrain) {
        m_terrain->m_size = size;
    }
}

void TerrainEditor::setHeightScale(float scale) {
    if (m_terrain) {
        m_terrain->m_heightScale = scale;
    }
}

void TerrainEditor::regenerate() {
    if (m_terrain) {
        m_terrain->regenerate();
    }
}

} // namespace kevla
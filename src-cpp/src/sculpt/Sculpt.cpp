#include "kevla/sculpt/Sculpt.h"
#include "kevla/render/Renderer.h"
#include "kevla/render/Mesh.h"
#include <cmath>
#include <algorithm>

namespace kevla {

// ============================================================
// SculptLayer Implementation
// ============================================================

SculptLayer::SculptLayer(const std::string& name)
    : m_name(name)
{
}

// ============================================================
// SculptSystem Implementation
// ============================================================

SculptSystem::SculptSystem()
    : m_mesh(nullptr)
    , m_activeLayer(0)
    , m_dynamicTopology(false)
    , m_initialized(false)
{
    m_brush = SculptBrush();
    m_stroke = SculptStroke();
}

SculptSystem::~SculptSystem() {
    shutdown();
}

void SculptSystem::initialize() {
    if (m_initialized) return;
    
    m_sculptMesh = std::make_unique<SculptMesh>();
    m_voxelGrid = std::make_unique<VoxelGrid>();
    m_voxelGrid->initialize(64, 0.1f);
    
    addLayer("Base");
    
    m_initialized = true;
}

void SculptSystem::shutdown() {
    if (!m_initialized) return;
    
    m_sculptMesh.reset();
    m_voxelGrid.reset();
    m_layers.clear();
    
    m_initialized = false;
}

void SculptSystem::setMesh(Mesh* mesh) {
    m_mesh = mesh;
    if (mesh) {
        initFromMesh(mesh);
    }
}

void SculptSystem::clearMesh() {
    m_sculptMesh = std::make_unique<SculptMesh>();
    m_mesh = nullptr;
}

void SculptSystem::initFromMesh(Mesh* mesh) {
    if (!mesh) return;
    
    m_sculptMesh = std::make_unique<SculptMesh>();
    
    const auto& vertices = mesh->getVertices();
    const auto& indices = mesh->getIndices();
    
    for (const auto& v : vertices) {
        SculptVertex sv;
        sv.position = v.position;
        sv.normal = v.normal;
        sv.uv = v.uv;
        m_sculptMesh->vertices.push_back(sv);
    }
    
    for (size_t i = 0; i < indices.size(); i += 3) {
        m_sculptMesh->faces.push_back(indices[i]);
        m_sculptMesh->faces.push_back(indices[i + 1]);
        m_sculptMesh->faces.push_back(indices[i + 2]);
    }
}

void SculptSystem::setTool(SculptToolType tool) {
    m_brush.type = tool;
}

void SculptSystem::beginStroke(const Vector3& position, float pressure) {
    m_stroke.points.clear();
    m_stroke.pressures.clear();
    m_stroke.currentStrength = m_brush.strength * pressure;
    m_stroke.points.push_back(position);
    m_stroke.pressures.push_back(pressure);
    m_stroke.isDragging = true;
    
    applyBrush(position, m_stroke.currentStrength);
}

void SculptSystem::updateStroke(const Vector3& position, float pressure) {
    if (!m_stroke.isDragging) return;
    
    m_stroke.points.push_back(position);
    m_stroke.pressures.push_back(pressure);
    m_stroke.currentStrength = m_brush.strength * pressure;
    
    applyBrush(position, m_stroke.currentStrength);
}

void SculptSystem::endStroke() {
    m_stroke.isDragging = false;
    m_stroke.points.clear();
    m_stroke.pressures.clear();
    
    updateRenderMesh();
    calculateNormals();
}

void SculptSystem::applyBrush(const Vector3& position, float strength) {
    if (!m_sculptMesh || m_sculptMesh->vertices.empty()) return;
    
    Vector3 brushPos = position;
    handleSymmetry(brushPos);
    
    float radius = m_brush.radius;
    
    switch (m_brush.type) {
        case SculptToolType::Draw:
            applyDrawBrush(brushPos, radius, strength);
            break;
        case SculptToolType::Erase:
            applyDrawBrush(brushPos, radius, -strength);
            break;
        case SculptToolType::Smooth:
            applySmoothBrush(brushPos, radius, strength);
            break;
        case SculptToolType::Flatten:
            applyFlattenBrush(brushPos, radius, strength);
            break;
        case SculptToolType::Pinch:
            applyPinchBrush(brushPos, radius, strength);
            break;
        case SculptToolType::Grab:
            applyGrabBrush(brushPos, radius, strength);
            break;
        case SculptToolType::Snake:
            applySnakeBrush(brushPos, radius, strength);
            break;
        default:
            applyDrawBrush(brushPos, radius, strength);
            break;
    }
}

void SculptSystem::applyDrawBrush(const Vector3& pos, float radius, float strength) {
    for (auto& v : m_sculptMesh->vertices) {
        float dist = (v.position - pos).length();
        if (dist < radius) {
            float falloff = 1.0f - (dist / radius);
            falloff = falloff * falloff * (3.0f - 2.0f * falloff);
            
            Vector3 direction = (v.position - pos).normalized();
            if (direction.lengthSquared() < 0.001f) {
                direction = Vector3::Up();
            }
            
            v.position += direction * falloff * strength * 0.1f;
            v.dirty = true;
        }
    }
}

void SculptSystem::applySmoothBrush(const Vector3& pos, float radius, float strength) {
    if (!m_sculptMesh || m_sculptMesh->vertices.size() < 3) return;
    
    std::vector<Vector3> positions;
    std::vector<Vector3> affected;
    
    for (auto& v : m_sculptMesh->vertices) {
        float dist = (v.position - pos).length();
        if (dist < radius) {
            affected.push_back(v.position);
            positions.push_back(v.position);
        }
    }
    
    if (affected.size() < 2) return;
    
    Vector3 average = Vector3::Zero();
    for (const auto& p : affected) {
        average += p;
    }
    average /= (float)affected.size();
    
    int idx = 0;
    for (auto& v : m_sculptMesh->vertices) {
        float dist = (v.position - pos).length();
        if (dist < radius) {
            float falloff = 1.0f - (dist / radius);
            v.position += (average - v.position) * falloff * strength * 0.5f;
            v.dirty = true;
        }
    }
}

void SculptSystem::applyFlattenBrush(const Vector3& pos, float radius, float strength) {
    float planeY = pos.y;
    
    for (auto& v : m_sculptMesh->vertices) {
        float dist = (Vector2(v.position.x, v.position.z) - Vector2(pos.x, pos.z)).length();
        if (dist < radius) {
            float falloff = 1.0f - (dist / radius);
            float delta = (planeY - v.position.y) * falloff * strength * 0.5f;
            v.position.y += delta;
            v.dirty = true;
        }
    }
}

void SculptSystem::applyPinchBrush(const Vector3& pos, float radius, float strength) {
    for (auto& v : m_sculptMesh->vertices) {
        float dist = (v.position - pos).length();
        if (dist < radius) {
            float falloff = 1.0f - (dist / radius);
            falloff = falloff * falloff;
            
            Vector3 direction = (pos - v.position).normalized();
            v.position -= direction * falloff * strength * m_brush.pinchStrength * 0.1f;
            v.dirty = true;
        }
    }
}

void SculptSystem::applyGrabBrush(const Vector3& pos, float radius, float strength) {
    if (m_stroke.points.size() < 2) return;
    
    Vector3 lastPos = m_stroke.points[m_stroke.points.size() - 2];
    Vector3 delta = pos - lastPos;
    
    for (auto& v : m_sculptMesh->vertices) {
        float dist = (v.position - pos).length();
        if (dist < radius) {
            float falloff = 1.0f - (dist / radius);
            v.position += delta * falloff * strength;
            v.dirty = true;
        }
    }
}

void SculptSystem::applySnakeBrush(const Vector3& pos, float radius, float strength) {
    if (m_stroke.points.size() < 2) {
        applyDrawBrush(pos, radius, strength * 0.5f);
        return;
    }
    
    Vector3 lastPos = m_stroke.points[m_stroke.points.size() - 2];
    Vector3 delta = pos - lastPos;
    Vector3 direction = delta.normalized();
    
    for (auto& v : m_sculptMesh->vertices) {
        float dist = (v.position - pos).length();
        if (dist < radius) {
            float falloff = 1.0f - (dist / radius);
            v.position += direction * falloff * strength * m_brush.snakeHookFactor * 0.3f;
            v.dirty = true;
        }
    }
}

void SculptSystem::handleSymmetry(Vector3& position) {
    if (m_symmetry.mirrorX && position.x < 0) {
        position.x = -position.x;
    }
    if (m_symmetry.mirrorY && position.y < 0) {
        position.y = -position.y;
    }
    if (m_symmetry.mirrorZ && position.z < 0) {
        position.z = -position.z;
    }
}

void SculptSystem::calculateNormals() {
    if (!m_sculptMesh) return;
    
    for (auto& v : m_sculptMesh->vertices) {
        v.normal = Vector3::Zero();
    }
    
    for (size_t i = 0; i < m_sculptMesh->faces.size(); i += 3) {
        int i0 = m_sculptMesh->faces[i];
        int i1 = m_sculptMesh->faces[i + 1];
        int i2 = m_sculptMesh->faces[i + 2];
        
        if (i0 >= (int)m_sculptMesh->vertices.size() ||
            i1 >= (int)m_sculptMesh->vertices.size() ||
            i2 >= (int)m_sculptMesh->vertices.size()) continue;
        
        Vector3 v0 = m_sculptMesh->vertices[i0].position;
        Vector3 v1 = m_sculptMesh->vertices[i1].position;
        Vector3 v2 = m_sculptMesh->vertices[i2].position;
        
        Vector3 edge1 = v1 - v0;
        Vector3 edge2 = v2 - v0;
        Vector3 normal = edge1.cross(edge2);
        
        m_sculptMesh->vertices[i0].normal += normal;
        m_sculptMesh->vertices[i1].normal += normal;
        m_sculptMesh->vertices[i2].normal += normal;
    }
    
    for (auto& v : m_sculptMesh->vertices) {
        v.normal = v.normal.normalized();
    }
}

void SculptSystem::updateRenderMesh() {
    if (!m_sculptMesh || !m_mesh) return;
    
    std::vector<Vertex> vertices;
    std::vector<uint32_t> indices;
    
    for (const auto& sv : m_sculptMesh->vertices) {
        Vertex v;
        v.position = sv.position;
        v.normal = sv.normal;
        v.uv = sv.uv;
        v.color = {1, 1, 1, 1};
        vertices.push_back(v);
    }
    
    indices = m_sculptMesh->faces;
    
    m_mesh->setVertices(vertices);
    m_mesh->setIndices(indices);
}

void SculptSystem::render(Renderer* renderer) {
    if (!renderer || !m_mesh) return;
    
    if (m_brush.showCursor) {
        renderer->drawSphere(m_stroke.points.empty() ? Vector3::Zero() : m_stroke.points.back(), 
                           m_brush.radius, {1, 1, 0, 0.3f});
    }
}

Mesh* SculptSystem::getRenderMesh() {
    return m_mesh;
}

Mesh* SculptSystem::exportAsMesh() {
    if (!m_sculptMesh) return nullptr;
    
    auto mesh = new Mesh();
    
    std::vector<Vertex> vertices;
    std::vector<uint32_t> indices;
    
    for (const auto& sv : m_sculptMesh->vertices) {
        Vertex v;
        v.position = sv.position;
        v.normal = sv.normal;
        v.uv = sv.uv;
        v.color = {1, 1, 1, 1};
        vertices.push_back(v);
    }
    
    indices = m_sculptMesh->faces;
    
    mesh->setVertices(vertices);
    mesh->setIndices(indices);
    
    return mesh;
}

void SculptSystem::addLayer(const std::string& name) {
    auto layer = std::make_unique<SculptLayer>(name);
    if (!m_sculptMesh->vertices.empty()) {
        layer->getDisplacements().resize(m_sculptMesh->vertices.size(), 0.0f);
    }
    m_layers.push_back(std::move(layer));
}

void SculptSystem::removeLayer(int index) {
    if (index >= 0 && index < (int)m_layers.size() && m_layers.size() > 1) {
        m_layers.erase(m_layers.begin() + index);
        if (m_activeLayer >= (int)m_layers.size()) {
            m_activeLayer = (int)m_layers.size() - 1;
        }
    }
}

void SculptSystem::setActiveLayer(int index) {
    if (index >= 0 && index < (int)m_layers.size()) {
        m_activeLayer = index;
    }
}

SculptLayer* SculptSystem::getLayer(int index) {
    if (index >= 0 && index < (int)m_layers.size()) {
        return m_layers[index].get();
    }
    return nullptr;
}

void SculptSystem::enableDynamicTopology(bool enable) {
    m_dynamicTopology = enable;
    if (m_sculptMesh) {
        m_sculptMesh->hasDynamicTopology = enable;
    }
}

void SculptSystem::voxelize() {
    if (m_voxelGrid && m_mesh) {
        m_voxelGrid->addSphere(Vector3::Zero(), 2.0f);
    }
}

void SculptSystem::addVoxel(const Vector3& position) {
    if (m_voxelGrid) {
        int x = (int)(position.x / m_voxelGrid->getScale());
        int y = (int)(position.y / m_voxelGrid->getScale());
        int z = (int)(position.z / m_voxelGrid->getScale());
        
        Voxel v;
        v.active = true;
        v.r = (uint8_t)(m_brush.color.x * 255);
        v.g = (uint8_t)(m_brush.color.y * 255);
        v.b = (uint8_t)(m_brush.color.z * 255);
        
        m_voxelGrid->setVoxel(x, y, z, v);
    }
}

void SculptSystem::removeVoxel(const Vector3& position) {
    if (m_voxelGrid) {
        int x = (int)(position.x / m_voxelGrid->getScale());
        int y = (int)(position.y / m_voxelGrid->getScale());
        int z = (int)(position.z / m_voxelGrid->getScale());
        
        Voxel v;
        v.active = false;
        m_voxelGrid->setVoxel(x, y, z, v);
    }
}

void SculptSystem::sculptVoxel(const Vector3& position, float strength) {
    if (!m_voxelGrid) return;
    
    if (m_brush.type == SculptToolType::Draw) {
        m_voxelGrid->addSphere(position, m_brush.radius * strength);
    } else if (m_brush.type == SculptToolType::Erase) {
        m_voxelGrid->subtractSphere(position, m_brush.radius * strength);
    } else if (m_brush.type == SculptToolType::Smooth) {
        m_voxelGrid->smoothSphere(position, m_brush.radius);
    }
}

// ============================================================
// VoxelGrid Implementation
// ============================================================

VoxelGrid::VoxelGrid()
    : m_size(64)
    , m_scale(0.1f)
{
}

void VoxelGrid::initialize(int size, float scale) {
    m_size = size;
    m_scale = scale;
    m_voxels.resize(size * size * size);
}

int VoxelGrid::getIndex(int x, int y, int z) const {
    return x + y * m_size + z * m_size * m_size;
}

bool VoxelGrid::isValid(int x, int y, int z) const {
    return x >= 0 && x < m_size && y >= 0 && y < m_size && z >= 0 && z < m_size;
}

Voxel* VoxelGrid::getVoxel(int x, int y, int z) {
    if (!isValid(x, y, z)) return nullptr;
    return &m_voxels[getIndex(x, y, z)];
}

void VoxelGrid::setVoxel(int x, int y, int z, const Voxel& voxel) {
    if (isValid(x, y, z)) {
        m_voxels[getIndex(x, y, z)] = voxel;
    }
}

void VoxelGrid::addSphere(const Vector3& center, float radius) {
    int radiusVoxels = (int)(radius / m_scale);
    
    for (int z = -radiusVoxels; z <= radiusVoxels; z++) {
        for (int y = -radiusVoxels; y <= radiusVoxels; y++) {
            for (int x = -radiusVoxels; x <= radiusVoxels; x++) {
                float dist = std::sqrt((float)(x*x + y*y + z*z)) * m_scale;
                if (dist <= radius) {
                    int vx = (int)(center.x / m_scale) + x;
                    int vy = (int)(center.y / m_scale) + y;
                    int vz = (int)(center.z / m_scale) + z;
                    
                    Voxel v;
                    v.active = true;
                    v.r = 200;
                    v.g = 150;
                    v.b = 100;
                    v.a = 255;
                    setVoxel(vx, vy, vz, v);
                }
            }
        }
    }
}

void VoxelGrid::subtractSphere(const Vector3& center, float radius) {
    int radiusVoxels = (int)(radius / m_scale);
    
    for (int z = -radiusVoxels; z <= radiusVoxels; z++) {
        for (int y = -radiusVoxels; y <= radiusVoxels; y++) {
            for (int x = -radiusVoxels; x <= radiusVoxels; x++) {
                float dist = std::sqrt((float)(x*x + y*y + z*z)) * m_scale;
                if (dist <= radius) {
                    int vx = (int)(center.x / m_scale) + x;
                    int vy = (int)(center.y / m_scale) + y;
                    int vz = (int)(center.z / m_scale) + z;
                    
                    Voxel v;
                    v.active = false;
                    setVoxel(vx, vy, vz, v);
                }
            }
        }
    }
}

void VoxelGrid::smoothSphere(const Vector3& center, float radius) {
    int radiusVoxels = (int)(radius / m_scale);
    
    std::vector<Voxel> original = m_voxels;
    
    for (int z = -radiusVoxels; z <= radiusVoxels; z++) {
        for (int y = -radiusVoxels; y <= radiusVoxels; y++) {
            for (int x = -radiusVoxels; x <= radiusVoxels; x++) {
                float dist = std::sqrt((float)(x*x + y*y + z*z)) * m_scale;
                if (dist <= radius) {
                    int vx = (int)(center.x / m_scale) + x;
                    int vy = (int)(center.y / m_scale) + y;
                    int vz = (int)(center.z / m_scale) + z;
                    
                    if (!isValid(vx, vy, vz)) continue;
                    
                    int activeCount = 0;
                    int sumR = 0, sumG = 0, sumB = 0;
                    
                    for (int dz = -1; dz <= 1; dz++) {
                        for (int dy = -1; dy <= 1; dy++) {
                            for (int dx = -1; dx <= 1; dx++) {
                                Voxel* neighbor = getVoxel(vx + dx, vy + dy, vz + dz);
                                if (neighbor && neighbor->active) {
                                    activeCount++;
                                    sumR += neighbor->r;
                                    sumG += neighbor->g;
                                    sumB += neighbor->b;
                                }
                            }
                        }
                    }
                    
                    if (activeCount > 0) {
                        Voxel v;
                        v.active = true;
                        v.r = (uint8_t)(sumR / activeCount);
                        v.g = (uint8_t)(sumG / activeCount);
                        v.b = (uint8_t)(sumB / activeCount);
                        v.a = 255;
                        setVoxel(vx, vy, vz, v);
                    }
                }
            }
        }
    }
}

Mesh* VoxelGrid::generateMesh() {
    auto mesh = new Mesh();
    
    std::vector<Vertex> vertices;
    std::vector<uint32_t> indices;
    
    for (int z = 0; z < m_size; z++) {
        for (int y = 0; y < m_size; y++) {
            for (int x = 0; x < m_size; x++) {
                Voxel* v = getVoxel(x, y, z);
                if (v && v->active) {
                    Vertex vert;
                    vert.position = {(float)x * m_scale, (float)y * m_scale, (float)z * m_scale};
                    vert.normal = Vector3::Up();
                    vert.uv = {0, 0};
                    vert.color = {v->r / 255.0f, v->g / 255.0f, v->b / 255.0f, 1.0f};
                    vertices.push_back(vert);
                }
            }
        }
    }
    
    for (size_t i = 0; i < vertices.size(); i += 8) {
        for (int j = 0; j < 6; j++) {
            indices.push_back((uint32_t)(i + 0));
            indices.push_back((uint32_t)(i + 1));
            indices.push_back((uint32_t)(i + 2));
        }
    }
    
    mesh->setVertices(vertices);
    mesh->setIndices(indices);
    
    return mesh;
}

// ============================================================
// VoxelSculptTool Implementation
// ============================================================

VoxelSculptTool::VoxelSculptTool()
    : m_mode(SculptToolType::Draw)
    , m_brushSize(1.0f)
    , m_brushStrength(0.5f)
{
}

void VoxelSculptTool::apply(VoxelGrid* grid, const Vector3& position) {
    if (!grid) return;
    
    switch (m_mode) {
        case SculptToolType::Draw:
            grid->addSphere(position, m_brushSize);
            break;
        case SculptToolType::Erase:
            grid->subtractSphere(position, m_brushSize);
            break;
        case SculptToolType::Smooth:
            grid->smoothSphere(position, m_brushSize);
            break;
        default:
            grid->addSphere(position, m_brushSize * m_brushStrength);
            break;
    }
}

} // namespace kevla
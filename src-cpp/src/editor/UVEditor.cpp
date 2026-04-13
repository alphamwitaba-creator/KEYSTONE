#include "kevla/editor/UVEditor.h"
#include "kevla/render/Renderer.h"
#include "kevla/render/Mesh.h"
#include <cmath>
#include <algorithm>
#include <set>

namespace kevla {

// ============================================================
// UVChannel Implementation
// ============================================================

UVChannel::UVChannel()
    : m_name("UV Channel 0")
    , m_index(0)
{
}

UVChannel::UVChannel(const std::string& name, int index)
    : m_name(name)
    , m_index(index)
{
}

void UVChannel::setUV(int index, const Vector2& uv) {
    if (index >= 0 && index < (int)m_uvs.size()) {
        m_uvs[index] = uv;
    }
}

Vector2 UVChannel::getUV(int index) const {
    if (index >= 0 && index < (int)m_uvs.size()) {
        return m_uvs[index];
    }
    return Vector2::Zero();
}

void UVChannel::resize(size_t count) {
    m_uvs.resize(count, Vector2::Zero());
}

void UVChannel::clear() {
    m_uvs.clear();
}

// ============================================================
// UVIsland Implementation
// ============================================================

UVIsland::UVIsland()
{
}

void UVIsland::addFace(int faceIndex) {
    m_faces.push_back(faceIndex);
}

void UVIsland::setBounds(float minU, float minV, float maxU, float maxV) {
    m_minU = minU;
    m_minV = minV;
    m_maxU = maxU;
    m_maxV = maxV;
}

void UVIsland::getBounds(float& minU, float& minV, float& maxU, float& maxV) const {
    minU = m_minU;
    minV = m_minV;
    maxU = m_maxU;
    maxV = m_maxV;
}

Vector2 UVIsland::getCenter() const {
    return { (m_minU + m_maxU) * 0.5f, (m_minV + m_maxV) * 0.5f };
}

// ============================================================
// UVSeam Implementation
// ============================================================

UVSeam::UVSeam()
    : m_vertexA(-1)
    , m_vertexB(-1)
{
}

UVSeam::UVSeam(int vertexA, int vertexB)
    : m_vertexA(vertexA)
    , m_vertexB(vertexB)
{
}

// ============================================================
// UVSelection Implementation
// ============================================================

UVSelection::UVSelection()
{
}

void UVSelection::selectVertex(int index) {
    if (!isVertexSelected(index)) {
        m_selectedVertices.push_back(index);
    }
}

void UVSelection::deselectVertex(int index) {
    auto it = std::find(m_selectedVertices.begin(), m_selectedVertices.end(), index);
    if (it != m_selectedVertices.end()) {
        m_selectedVertices.erase(it);
    }
}

void UVSelection::toggleVertex(int index) {
    if (isVertexSelected(index)) {
        deselectVertex(index);
    } else {
        selectVertex(index);
    }
}

void UVSelection::selectFace(int index) {
    if (!isFaceSelected(index)) {
        m_selectedFaces.push_back(index);
    }
}

void UVSelection::deselectFace(int index) {
    auto it = std::find(m_selectedFaces.begin(), m_selectedFaces.end(), index);
    if (it != m_selectedFaces.end()) {
        m_selectedFaces.erase(it);
    }
}

void UVSelection::selectAll(size_t count) {
    m_selectedVertices.clear();
    for (size_t i = 0; i < count; i++) {
        m_selectedVertices.push_back((int)i);
    }
}

void UVSelection::deselectAll() {
    m_selectedVertices.clear();
    m_selectedFaces.clear();
}

bool UVSelection::isVertexSelected(int index) const {
    return std::find(m_selectedVertices.begin(), m_selectedVertices.end(), index) != m_selectedVertices.end();
}

bool UVSelection::isFaceSelected(int index) const {
    return std::find(m_selectedFaces.begin(), m_selectedFaces.end(), index) != m_selectedFaces.end();
}

void UVSelection::invertSelection(size_t totalVertices, size_t totalFaces) {
    std::vector<int> newSelection;
    
    for (size_t i = 0; i < totalVertices; i++) {
        if (!isVertexSelected((int)i)) {
            newSelection.push_back((int)i);
        }
    }
    m_selectedVertices = newSelection;
    
    newSelection.clear();
    for (size_t i = 0; i < totalFaces; i++) {
        if (!isFaceSelected((int)i)) {
            newSelection.push_back((int)i);
        }
    }
    m_selectedFaces = newSelection;
}

// ============================================================
// UVEditor Implementation
// ============================================================

UVEditor::UVEditor()
    : m_mesh(nullptr)
    , m_activeChannel(0)
    , m_editing(false)
    , m_initialized(false)
{
    m_brush = UVBrush();
}

UVEditor::~UVEditor() {
    shutdown();
}

void UVEditor::initialize() {
    if (m_initialized) return;
    
    addChannel("UV Channel 0");
    m_initialized = true;
}

void UVEditor::shutdown() {
    if (!m_initialized) return;
    
    m_channels.clear();
    m_islands.clear();
    m_seams.clear();
    m_undoStack.clear();
    m_redoStack.clear();
    
    m_initialized = false;
}

void UVEditor::setMesh(Mesh* mesh) {
    m_mesh = mesh;
    if (mesh) {
        resizeUVs(mesh->getVertexCount());
        calculateIslands();
    }
}

void UVEditor::resizeUVs(size_t count) {
    for (auto& channel : m_channels) {
        channel->resize(count);
    }
}

void UVEditor::addChannel(const std::string& name) {
    auto channel = std::make_unique<UVChannel>(name, (int)m_channels.size());
    if (m_mesh) {
        channel->resize(m_mesh->getVertexCount());
    }
    m_channels.push_back(std::move(channel));
}

void UVEditor::removeChannel(int index) {
    if (index >= 0 && index < (int)m_channels.size() && m_channels.size() > 1) {
        m_channels.erase(m_channels.begin() + index);
        if (m_activeChannel >= (int)m_channels.size()) {
            m_activeChannel = (int)m_channels.size() - 1;
        }
    }
}

void UVEditor::setActiveChannel(int index) {
    if (index >= 0 && index < (int)m_channels.size()) {
        m_activeChannel = index;
    }
}

UVChannel* UVEditor::getChannel(int index) {
    if (index >= 0 && index < (int)m_channels.size()) {
        return m_channels[index].get();
    }
    return nullptr;
}

void UVEditor::beginEdit() {
    m_editing = true;
}

void UVEditor::endEdit() {
    m_editing = false;
}

void UVEditor::selectTool(UVToolType tool) {
    m_brush.type = tool;
}

void UVEditor::setBrush(const UVBrush& brush) {
    m_brush = brush;
}

void UVEditor::handleMouseDown(float x, float y, int button) {
    (void)x;
    (void)y;
    (void)button;
}

void UVEditor::handleMouseMove(float x, float y) {
    (void)x;
    (void)y;
}

void UVEditor::handleMouseUp(int button) {
    (void)button;
}

void UVEditor::handleScroll(float delta) {
    m_brush.size += delta * 10.0f;
    if (m_brush.size < 1.0f) m_brush.size = 1.0f;
    if (m_brush.size > 500.0f) m_brush.size = 500.0f;
}

void UVEditor::translateSelected(const Vector2& delta) {
    if (m_activeChannel < 0 || m_activeChannel >= (int)m_channels.size()) return;
    
    auto& uvs = m_channels[m_activeChannel]->getUVs();
    
    for (int idx : m_selection.getSelectedVertices()) {
        if (idx >= 0 && idx < (int)uvs.size()) {
            uvs[idx] += delta;
        }
    }
}

void UVEditor::rotateSelected(float angle) {
    if (m_activeChannel < 0 || m_activeChannel >= (int)m_channels.size()) return;
    
    auto& uvs = m_channels[m_activeChannel]->getUVs();
    
    Vector2 center = Vector2::Zero();
    int count = 0;
    for (int idx : m_selection.getSelectedVertices()) {
        if (idx >= 0 && idx < (int)uvs.size()) {
            center += uvs[idx];
            count++;
        }
    }
    if (count > 0) center /= (float)count;
    
    float c = std::cos(angle);
    float s = std::sin(angle);
    
    for (int idx : m_selection.getSelectedVertices()) {
        if (idx >= 0 && idx < (int)uvs.size()) {
            Vector2 p = uvs[idx] - center;
            uvs[idx] = { center.x + p.x * c - p.y * s, center.y + p.x * s + p.y * c };
        }
    }
}

void UVEditor::scaleSelected(const Vector2& scale) {
    if (m_activeChannel < 0 || m_activeChannel >= (int)m_channels.size()) return;
    
    auto& uvs = m_channels[m_activeChannel]->getUVs();
    
    Vector2 center = Vector2::Zero();
    int count = 0;
    for (int idx : m_selection.getSelectedVertices()) {
        if (idx >= 0 && idx < (int)uvs.size()) {
            center += uvs[idx];
            count++;
        }
    }
    if (count > 0) center /= (float)count;
    
    for (int idx : m_selection.getSelectedVertices()) {
        if (idx >= 0 && idx < (int)uvs.size()) {
            uvs[idx] = center + (uvs[idx] - center) * scale;
        }
    }
}

void UVEditor::mirrorSelected(int axis) {
    if (m_activeChannel < 0 || m_activeChannel >= (int)m_channels.size()) return;
    
    auto& uvs = m_channels[m_activeChannel]->getUVs();
    
    for (int idx : m_selection.getSelectedVertices()) {
        if (idx >= 0 && idx < (int)uvs.size()) {
            if (axis == 0) {
                uvs[idx].x = 1.0f - uvs[idx].x;
            } else if (axis == 1) {
                uvs[idx].y = 1.0f - uvs[idx].y;
            }
        }
    }
}

void UVEditor::weldSelected() {
}

void UVEditor::stitchSelected(int targetIsland) {
    (void)targetIsland;
}

void UVEditor::straightenSelected() {
    if (m_activeChannel < 0 || m_activeChannel >= (int)m_channels.size()) return;
    
    auto& uvs = m_channels[m_activeChannel]->getUVs();
    
    if (m_selection.getVertexCount() < 2) return;
    
    Vector2 first = uvs[m_selection.getSelectedVertices()[0]];
    Vector2 last = uvs[m_selection.getSelectedVertices().back()];
    
    Vector2 direction = (last - first).normalized();
    
    for (size_t i = 0; i < m_selection.getSelectedVertices().size(); i++) {
        int idx = m_selection.getSelectedVertices()[i];
        if (idx >= 0 && idx < (int)uvs.size()) {
            float t = (float)i / (float)(m_selection.getSelectedVertices().size() - 1);
            uvs[idx] = first + direction * t * (last - first).length();
        }
    }
}

void UVEditor::unwrap(const UnwrapOptions& options) {
    (void)options;
    
    if (!m_mesh) return;
    
    auto& uvs = m_channels[m_activeChannel]->getUVs();
    
    for (size_t i = 0; i < uvs.size(); i++) {
        uvs[i] = { (float)(i % 10) / 10.0f, (float)(i / 10) / 10.0f };
    }
    
    calculateIslands();
}

void UVEditor::pack(const UnwrapOptions& options) {
    (void)options;
    
    if (m_islands.empty()) return;
    
    float margin = options.packMargin;
    float spacing = margin * 2.0f;
    
    float currentX = margin;
    float currentY = margin;
    float rowHeight = 0.0f;
    float maxWidth = 1.0f - margin * 2.0f;
    
    auto& uvs = m_channels[m_activeChannel]->getUVs();
    
    for (auto& island : m_islands) {
        float minU, minV, maxU, maxV;
        island->getBounds(minU, minV, maxU, maxV);
        
        float width = maxU - minU;
        float height = maxV - minV;
        
        if (currentX + width > maxWidth) {
            currentX = margin;
            currentY += rowHeight + spacing;
            rowHeight = 0.0f;
        }
        
        for (int faceIdx : island->getFaces()) {
            int v0 = m_mesh->getIndices()[faceIdx * 3 + 0];
            int v1 = m_mesh->getIndices()[faceIdx * 3 + 1];
            int v2 = m_mesh->getIndices()[faceIdx * 3 + 2];
            
            Vector2 offset = { currentX - minU, currentY - minV };
            
            if (v0 >= 0 && v0 < (int)uvs.size()) uvs[v0] += offset;
            if (v1 >= 0 && v1 < (int)uvs.size()) uvs[v1] += offset;
            if (v2 >= 0 && v2 < (int)uvs.size()) uvs[v2] += offset;
        }
        
        currentX += width + spacing;
        rowHeight = std::max(rowHeight, height);
    }
}

void UVEditor::undo() {
    if (!m_undoStack.empty()) {
        auto& current = m_channels[m_activeChannel]->getUVs();
        m_redoStack.push_back(current);
        current = m_undoStack.back();
        m_undoStack.pop_back();
    }
}

void UVEditor::redo() {
    if (!m_redoStack.empty()) {
        auto& current = m_channels[m_activeChannel]->getUVs();
        m_undoStack.push_back(current);
        current = m_redoStack.back();
        m_redoStack.pop_back();
    }
}

void UVEditor::render(Renderer* renderer) {
    (void)renderer;
}

void UVEditor::calculateIslands() {
    m_islands.clear();
    
    if (!m_mesh) return;
    
    const auto& indices = m_mesh->getIndices();
    if (indices.empty()) return;
    
    std::set<int> processedFaces;
    
    for (size_t i = 0; i < indices.size() / 3; i++) {
        if (processedFaces.count((int)i)) continue;
        
        auto island = std::make_unique<UVIsland>();
        island->addFace((int)i);
        processedFaces.insert((int)i);
        
        m_islands.push_back(std::move(island));
    }
}

void UVEditor::calculateSeams() {
    m_seams.clear();
}

void UVEditor::updateRenderMesh() {
}

float UVEditor::getUVArea() const {
    if (m_activeChannel < 0 || m_activeChannel >= (int)m_channels.size()) return 0.0f;
    
    const auto& uvs = m_channels[m_activeChannel]->getUVs();
    
    float area = 0.0f;
    const auto& indices = m_mesh->getIndices();
    
    for (size_t i = 0; i < indices.size(); i += 3) {
        if (indices[i] >= (int)uvs.size() || indices[i + 1] >= (int)uvs.size() || indices[i + 2] >= (int)uvs.size()) {
            continue;
        }
        
        Vector2 u0 = uvs[indices[i]];
        Vector2 u1 = uvs[indices[i + 1]];
        Vector2 u2 = uvs[indices[i + 2]];
        
        area += std::abs((u1.x - u0.x) * (u2.y - u0.y) - (u2.x - u0.x) * (u1.y - u0.y)) * 0.5f;
    }
    
    return area;
}

float UVEditor::getTexelDensity(float worldSize) const {
    (void)worldSize;
    return 0.0f;
}

// ============================================================
// UVViewport Implementation
// ============================================================

UVViewport::UVViewport()
    : m_uvEditor(nullptr)
    , m_zoom(1.0f)
    , m_panX(0.0f)
    , m_panY(0.0f)
    , m_showGrid(true)
    , m_showCheckerboard(true)
    , m_showGizmo(false)
    , m_lastMouseX(0)
    , m_lastMouseY(0)
    , m_dragging(false)
{
}

void UVViewport::initialize() {
}

void UVViewport::shutdown() {
}

void UVViewport::render() {
    if (m_showCheckerboard) {
        renderCheckerboard();
    }
    if (m_showGrid) {
        renderGrid();
    }
    if (m_uvEditor) {
        renderUVs();
        renderSelection();
    }
    if (m_showGizmo) {
        renderGizmo();
    }
}

void UVViewport::update(float deltaTime) {
    (void)deltaTime;
}

void UVViewport::renderGrid() {
}

void UVViewport::renderCheckerboard() {
}

void UVViewport::renderUVs() {
}

void UVViewport::renderSelection() {
}

void UVViewport::renderGizmo() {
}

void UVViewport::handleMouseDown(float x, float y, int button) {
    m_lastMouseX = (int)x;
    m_lastMouseY = (int)y;
    
    if (button == 2) {
        m_dragging = true;
    }
    
    if (m_uvEditor && button == 0) {
        m_uvEditor->handleMouseDown(x, y, button);
    }
}

void UVViewport::handleMouseMove(float x, float y) {
    if (m_dragging) {
        m_panX += (x - m_lastMouseX) * m_zoom;
        m_panY += (y - m_lastMouseY) * m_zoom;
    }
    
    m_lastMouseX = (int)x;
    m_lastMouseY = (int)y;
    
    if (m_uvEditor && m_dragging) {
        m_uvEditor->handleMouseMove(x, y);
    }
}

void UVViewport::handleMouseUp(int button) {
    m_dragging = false;
    
    if (m_uvEditor && button == 0) {
        m_uvEditor->handleMouseUp(button);
    }
}

void UVViewport::handleScroll(float delta) {
    float zoomFactor = delta > 0 ? 0.9f : 1.1f;
    m_zoom *= zoomFactor;
    if (m_zoom < 0.01f) m_zoom = 0.01f;
    if (m_zoom > 100.0f) m_zoom = 100.0f;
}

void UVViewport::zoomIn() {
    m_zoom *= 1.2f;
    if (m_zoom > 100.0f) m_zoom = 100.0f;
}

void UVViewport::zoomOut() {
    m_zoom *= 0.8f;
    if (m_zoom < 0.01f) m_zoom = 0.01f;
}

void UVViewport::resetView() {
    m_zoom = 1.0f;
    m_panX = 0.0f;
    m_panY = 0.0f;
}

void UVViewport::fitToView() {
    m_zoom = 1.0f;
    m_panX = 0.5f;
    m_panY = 0.5f;
}

} // namespace kevla
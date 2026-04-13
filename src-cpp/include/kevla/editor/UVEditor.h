#pragma once

#include <vector>
#include <string>
#include <memory>
#include "kevla/Vector.h"

namespace kevla {

// ============================================================
// UV Channel
// ============================================================

class UVChannel {
public:
    UVChannel();
    UVChannel(const std::string& name, int index);
    ~UVChannel() = default;
    
    void setName(const std::string& name) { m_name = name; }
    const std::string& getName() const { return m_name; }
    
    void setIndex(int index) { m_index = index; }
    int getIndex() const { return m_index; }
    
    std::vector<Vector2>& getUVs() { return m_uvs; }
    const std::vector<Vector2>& getUVs() const { return m_uvs; }
    
    void setUV(int index, const Vector2& uv);
    Vector2 getUV(int index) const;
    
    void resize(size_t count);
    void clear();
    
private:
    std::string m_name;
    int m_index = 0;
    std::vector<Vector2> m_uvs;
};

// ============================================================
// UV Island
// ============================================================

class UVIsland {
public:
    UVIsland();
    ~UVIsland() = default;
    
    void addFace(int faceIndex);
    const std::vector<int>& getFaces() const { return m_faces; }
    
    void setBounds(float minU, float minV, float maxU, float maxV);
    void getBounds(float& minU, float& minV, float& maxU, float& maxV) const;
    
    Vector2 getCenter() const;
    
    void select() { m_selected = true; }
    void deselect() { m_selected = false; }
    bool isSelected() const { return m_selected; }
    
private:
    std::vector<int> m_faces;
    float m_minU = 0, m_minV = 0;
    float m_maxU = 1, m_maxV = 1;
    bool m_selected = false;
};

// ============================================================
// UV Seam
// ============================================================

class UVSeam {
public:
    UVSeam();
    UVSeam(int vertexA, int vertexB);
    ~UVSeam() = default;
    
    void setVertices(int a, int b) { m_vertexA = a; m_vertexB = b; }
    int getVertexA() const { return m_vertexA; }
    int getVertexB() const { return m_vertexB; }
    
    void select() { m_selected = true; }
    void deselect() { m_selected = false; }
    bool isSelected() const { return m_selected; }
    
private:
    int m_vertexA = -1;
    int m_vertexB = -1;
    bool m_selected = false;
};

// ============================================================
// UV Transform
// ============================================================

struct UVTransform {
    Vector2 translation = Vector2::Zero();
    float rotation = 0.0f;
    Vector2 scale = Vector2::One();
    
    void reset() {
        translation = Vector2::Zero();
        rotation = 0.0f;
        scale = Vector2::One();
    }
};

// ============================================================
// UV Editor Tool Types
// ============================================================

enum class UVToolType {
    Move,
    Rotate,
    Scale,
    Mirror,
    Weld,
    Stitch,
    Straighten,
    Unwrap,
    Pack,
    Select,
    Marquee,
    MagicWand
};

// ============================================================
// UV Editor Brush
// ============================================================

struct UVBrush {
    UVToolType type = UVToolType::Move;
    float size = 50.0f;
    float strength = 1.0f;
    bool aspectCorrect = true;
    int symmetryAxis = -1;
};

// ============================================================
// UV Selection
// ============================================================

class UVSelection {
public:
    UVSelection();
    ~UVSelection() = default;
    
    void selectVertex(int index);
    void deselectVertex(int index);
    void toggleVertex(int index);
    void selectFace(int index);
    void deselectFace(int index);
    void selectAll(size_t count);
    void deselectAll();
    
    bool isVertexSelected(int index) const;
    bool isFaceSelected(int index) const;
    
    const std::vector<int>& getSelectedVertices() const { return m_selectedVertices; }
    const std::vector<int>& getSelectedFaces() const { return m_selectedFaces; }
    
    int getVertexCount() const { return (int)m_selectedVertices.size(); }
    int getFaceCount() const { return (int)m_selectedFaces.size(); }
    
    void invertSelection(size_t totalVertices, size_t totalFaces);
    
private:
    std::vector<int> m_selectedVertices;
    std::vector<int> m_selectedFaces;
};

// ============================================================
// UV Unwrap Options
// ============================================================

struct UnwrapOptions {
    float packMargin = 0.0f;
    bool pack = true;
    bool correctAspect = true;
    bool rootPivot = true;
    bool transformPivot = true;
    int iterations = 4;
    float angleLimit = 89.0f;
    float islandMargin = 0.0f;
    bool fillHoles = true;
    bool onlyIslandSeams = false;
};

// ============================================================
// Main UV Editor System
// ============================================================

class UVEditor {
public:
    UVEditor();
    ~UVEditor();
    
    void initialize();
    void shutdown();
    
    // Mesh binding
    void setMesh(class Mesh* mesh);
    Mesh* getMesh() const { return m_mesh; }
    
    // Channel management
    void addChannel(const std::string& name);
    void removeChannel(int index);
    void setActiveChannel(int index);
    int getActiveChannel() const { return m_activeChannel; }
    UVChannel* getChannel(int index);
    
    // Editing
    void beginEdit();
    void endEdit();
    bool isEditing() const { return m_editing; }
    
    void selectTool(UVToolType tool);
    void setBrush(const UVBrush& brush);
    
    void handleMouseDown(float x, float y, int button);
    void handleMouseMove(float x, float y);
    void handleMouseUp(int button);
    void handleScroll(float delta);
    
    // Transformations
    void translateSelected(const Vector2& delta);
    void rotateSelected(float angle);
    void scaleSelected(const Vector2& scale);
    void mirrorSelected(int axis);
    
    // Operations
    void weldSelected();
    void stitchSelected(int targetIsland);
    void straightenSelected();
    void unwrap(const UnwrapOptions& options);
    void pack(const UnwrapOptions& options);
    
    // Selection
    UVSelection& getSelection() { return m_selection; }
    const UVSelection& getSelection() const { return m_selection; }
    
    // Undo/Redo
    void undo();
    void redo();
    
    // Visualization
    void render(class Renderer* renderer);
    
    // Statistics
    int getIslandCount() const { return (int)m_islands.size(); }
    float getUVArea() const;
    float getTexelDensity(float worldSize) const;
    
private:
    void calculateIslands();
    void calculateSeams();
    void updateRenderMesh();
    
    Mesh* m_mesh = nullptr;
    
    std::vector<std::unique_ptr<UVChannel>> m_channels;
    int m_activeChannel = 0;
    
    std::vector<std::unique_ptr<UVIsland>> m_islands;
    std::vector<std::unique_ptr<UVSeam>> m_seams;
    
    UVSelection m_selection;
    UVBrush m_brush;
    UVTransform m_transform;
    
    bool m_editing = false;
    bool m_initialized = false;
    
    std::vector<std::vector<Vector2>> m_undoStack;
    std::vector<std::vector<Vector2>> m_redoStack;
};

// ============================================================
// UV Viewport
// ============================================================

class UVViewport {
public:
    UVViewport();
    ~UVViewport() = default;
    
    void initialize();
    void shutdown();
    
    void setUVEditor(UVEditor* editor) { m_uvEditor = editor; }
    
    void render();
    void update(float deltaTime);
    
    void setBackgroundColor(const Color& color) { m_backgroundColor = color; }
    void setGridVisible(bool visible) { m_showGrid = visible; }
    void setCheckerboard(bool visible) { m_showCheckerboard = visible; }
    void setGizmoVisible(bool visible) { m_showGizmo = visible; }
    
    void handleMouseDown(float x, float y, int button);
    void handleMouseMove(float x, float y);
    void handleMouseUp(int button);
    void handleScroll(float delta);
    
    void zoomIn();
    void zoomOut();
    void resetView();
    void fitToView();
    
    void setZoom(float zoom) { m_zoom = zoom; }
    float getZoom() const { return m_zoom; }
    
    void setPan(float x, float y) { m_panX = x; m_panY = y; }
    float getPanX() const { return m_panX; }
    float getPanY() const { return m_panY; }
    
private:
    void renderGrid();
    void renderCheckerboard();
    void renderUVs();
    void renderSelection();
    void renderGizmo();
    
    UVEditor* m_uvEditor = nullptr;
    
    float m_zoom = 1.0f;
    float m_panX = 0.0f;
    float m_panY = 0.0f;
    
    Color m_backgroundColor = {0.15f, 0.15f, 0.15f, 1.0f};
    bool m_showGrid = true;
    bool m_showCheckerboard = true;
    bool m_showGizmo = false;
    
    int m_lastMouseX = 0;
    int m_lastMouseY = 0;
    bool m_dragging = false;
};

} // namespace kevla
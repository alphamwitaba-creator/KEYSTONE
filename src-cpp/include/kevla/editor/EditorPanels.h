#pragma once

#include <memory>
#include <string>

namespace kevla {

// ============================================================
// Scene View Panel
// ============================================================

class SceneView {
public:
    SceneView();
    ~SceneView() = default;
    
    void render();
    void setCamera(class Camera* camera) { m_camera = camera; }
    
private:
    class Camera* m_camera = nullptr;
    bool m_allowFocus = true;
};

// ============================================================
// Hierarchy Panel - Entity Tree
// ============================================================

class HierarchyPanel {
public:
    HierarchyPanel();
    ~HierarchyPanel() = default;
    
    void render();
    void update();
    void setSelected(Entity* entity);
    
    Entity* getSelected() const { return m_selected; }
    
private:
    void renderEntityTree(Entity* entity, int& nodeId);
    
    Entity* m_selected = nullptr;
    int m_renamedEntity = -1;
};

// ============================================================
// Inspector Panel - Entity Properties
// ============================================================

class InspectorPanel {
public:
    InspectorPanel();
    ~InspectorPanel() = default;
    
    void render();
    void update();
    void setEntity(Entity* entity);
    
private:
    void renderTransform();
    void renderComponents();
    
    Entity* m_entity = nullptr;
};

// ============================================================
// Toolbar Panel
// ============================================================

class ToolbarPanel {
public:
    ToolbarPanel();
    ~ToolbarPanel() = default;
    
    void render();
    
private:
    enum class Tool { Select, Move, Rotate, Scale, Pan };
    Tool m_currentTool = Tool::Select;
};

} // namespace kevla
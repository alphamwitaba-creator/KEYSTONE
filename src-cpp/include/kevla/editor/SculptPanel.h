#pragma once

#include <memory>
#include <string>

namespace kevla {

// ============================================================
// Sculpt Panel - UI for 3D Sculpting
// ============================================================

class SculptPanel {
public:
    SculptPanel();
    ~SculptPanel();
    
    void initialize();
    void shutdown();
    
    void render();
    void update(float deltaTime);
    
    void setActive(bool active) { m_active = active; }
    bool isActive() const { return m_active; }
    
    class SculptSystem* getSculptSystem() { return m_sculptSystem.get(); }
    
private:
    void renderToolbar();
    void renderBrushSettings();
    void renderLayers();
    void renderSymmetrySettings();
    void renderToolOptions();
    
    std::unique_ptr<class SculptSystem> m_sculptSystem;
    bool m_active = false;
    int m_selectedTool = 0;
};

// ============================================================
// Sculpt View - 3D Viewport for sculpting
// ============================================================

class SculptView {
public:
    SculptView();
    ~SculptView() = default;
    
    void initialize();
    void shutdown();
    
    void render();
    void update(float deltaTime);
    
    void setSculptSystem(class SculptSystem* system) { m_sculptSystem = system; }
    
    void handleMouseDown(float x, float y, int button);
    void handleMouseMove(float x, float y);
    void handleMouseUp(int button);
    void handleScroll(float delta);
    
    void setBrushSize(float size);
    void setBrushStrength(float strength);
    
private:
    void updateCamera();
    void renderGrid();
    void renderSculptMesh();
    
    class SculptSystem* m_sculptSystem = nullptr;
    
    enum class ViewMode { Perspective, Top, Bottom, Front, Back, Left, Right };
    ViewMode m_viewMode = ViewMode::Perspective;
    
    float m_cameraDistance = 5.0f;
    float m_cameraAngleX = 0.0f;
    float m_cameraAngleY = 0.0f;
    
    bool m_orbitMode = false;
    float m_lastMouseX = 0.0f;
    float m_lastMouseY = 0.0f;
    
    float m_brushSize = 1.0f;
    float m_brushStrength = 0.5f;
    
    bool m_showGrid = true;
    bool m_showWireframe = false;
    bool m_doubleSided = false;
    float m_clipStart = 0.1f;
    float m_clipEnd = 100.0f;
};

// ============================================================
// Sculpt Mode Manager
// ============================================================

class SculptModeManager {
public:
    SculptModeManager();
    ~SculptModeManager() = default;
    
    void enterSculptMode();
    void exitSculptMode();
    
    bool isInSculptMode() const { return m_inSculptMode; }
    
    SculptPanel* getPanel() { return m_panel.get(); }
    SculptView* getView() { return m_view.get(); }
    
private:
    bool m_inSculptMode = false;
    std::unique_ptr<SculptPanel> m_panel;
    std::unique_ptr<SculptView> m_view;
};

} // namespace kevla
#pragma once

#include <string>
#include <memory>
#include <GLFW/glfw3.h>

namespace kevla {

// ============================================================
// Editor - Main Editor Application
// ============================================================

class Editor {
public:
    Editor();
    ~Editor();
    
    void initialize(GLFWwindow* window);
    void shutdown();
    
    void update(float deltaTime);
    void render(float deltaTime);
    
    // File operations
    void newScene();
    void openScene(const std::string& path);
    void saveScene(const std::string& path);
    
    // Selection
    Entity* getSelectedEntity() const { return m_selectedEntity; }
    void setSelectedEntity(Entity* entity);
    
    // Getters
    class SceneView* getSceneView() { return m_sceneView.get(); }
    class HierarchyPanel* getHierarchyPanel() { return m_hierarchyPanel.get(); }
    class InspectorPanel* getInspectorPanel() { return m_inspectorPanel.get(); }
    
private:
    void setupLayout();
    void setupMenuBar();
    void setupDocking();
    
    GLFWwindow* m_window = nullptr;
    bool m_initialized = false;
    
    // Panels
    std::unique_ptr<class SceneView> m_sceneView;
    std::unique_ptr<class HierarchyPanel> m_hierarchyPanel;
    std::unique_ptr<class InspectorPanel> m_inspectorPanel;
    std::unique_ptr<class ToolbarPanel> m_toolbarPanel;
    
    // State
    Entity* m_selectedEntity = nullptr;
    std::string m_currentScenePath;
    bool m_sceneModified = false;
    
    // Editor mode
    enum class Mode { Play, Pause, Edit };
    Mode m_mode = Mode::Edit;
};

} // namespace kevla
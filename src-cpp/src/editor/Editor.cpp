#include "kevla/editor/Editor.h"
#include "kevla/editor/SceneView.h"
#include "kevla/editor/HierarchyPanel.h"
#include "kevla/editor/InspectorPanel.h"
#include "kevla/editor/ToolbarPanel.h"
#include "kevla/Core.h"
#include <imgui.h>

namespace kevla {

Editor::Editor() {
    m_sceneView = std::make_unique<SceneView>();
    m_hierarchyPanel = std::make_unique<HierarchyPanel>();
    m_inspectorPanel = std::make_unique<InspectorPanel>();
    m_toolbarPanel = std::make_unique<ToolbarPanel>();
}

Editor::~Editor() {
    shutdown();
}

void Editor::initialize(GLFWwindow* window) {
    m_window = window;
    m_initialized = true;
    
    KEVLA_INFO("Editor initialized");
}

void Editor::shutdown() {
    m_initialized = false;
}

void Editor::update(float deltaTime) {
    // Update panels
    m_hierarchyPanel->update();
    m_inspectorPanel->update();
}

void Editor::render(float deltaTime) {
    if (!m_initialized) return;
    
    // Main menu bar
    setupMenuBar();
    
    // Toolbar
    m_toolbarPanel->render();
    
    // Docking setup
    setupDocking();
    
    // Render panels
    m_sceneView->render();
    m_hierarchyPanel->render();
    m_inspectorPanel->render();
    
    // Status bar
    ImGui::Begin("Status", nullptr, ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoResize);
    ImGui::Text("KEVLA Engine v2.0.0 | FPS: %.1f | Entities: %zu", 
                getEngine()->getFPS(), 
                getEngine()->getScene()->getEntityCount());
    ImGui::SameLine(ImGui::GetWindowWidth() - 100);
    ImGui::Text("%s", m_mode == Mode::Play ? "PLAYING" : "EDIT");
    ImGui::End();
}

void Editor::setupMenuBar() {
    if (ImGui::BeginMainMenuBar()) {
        if (ImGui::BeginMenu("File")) {
            if (ImGui::MenuItem("New Scene", "Ctrl+N")) newScene();
            if (ImGui::MenuItem("Open Scene...", "Ctrl+O")) {}
            if (ImGui::MenuItem("Save", "Ctrl+S")) {}
            if (ImGui::MenuItem("Save As...", "Ctrl+Shift+S")) {}
            ImGui::Separator();
            if (ImGui::MenuItem("Exit", "Alt+F4")) {}
            ImGui::EndMenu();
        }
        
        if (ImGui::BeginMenu("Edit")) {
            if (ImGui::MenuItem("Undo", "Ctrl+Z")) {}
            if (ImGui::MenuItem("Redo", "Ctrl+Y")) {}
            ImGui::Separator();
            if (ImGui::MenuItem("Cut", "Ctrl+X")) {}
            if (ImGui::MenuItem("Copy", "Ctrl+C")) {}
            if (ImGui::MenuItem("Paste", "Ctrl+V")) {}
            ImGui::EndMenu();
        }
        
        if (ImGui::BeginMenu("GameObject")) {
            if (ImGui::MenuItem("Create Empty")) {}
            ImGui::Separator();
            if (ImGui::MenuItem("3D Object")) {}
            if (ImGui::MenuItem("Light")) {}
            if (ImGui::MenuItem("Camera")) {}
            ImGui::EndMenu();
        }
        
        if (ImGui::BeginMenu("View")) {
            if (ImGui::MenuItem("Scene")) {}
            if (ImGui::MenuItem("Hierarchy")) {}
            if (ImGui::MenuItem("Inspector")) {}
            ImGui::EndMenu();
        }
        
        if (ImGui::BeginMenu("Help")) {
            if (ImGui::MenuItem("Documentation")) {}
            if (ImGui::MenuItem("About")) {}
            ImGui::EndMenu();
        }
        
        ImGui::EndMainMenuBar();
    }
}

void Editor::setupDocking() {
    ImGuiWindowFlags windowFlags = ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoResize;
    
    ImGui::SetNextWindowPos(ImVec2(0, 20));
    ImGui::SetNextWindowSize(ImVec2(1280, 700));
    
    ImGui::Begin("DockSpace", nullptr, ImGuiWindowFlags_NoMove | ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoTitleBar);
    ImGui::DockSpace(ImGui::GetID("MainDockSpace"), ImVec2(0, 0), ImGuiDockNodeFlags_PassthruCentralNode);
    ImGui::End();
}

void Editor::newScene() {
    if (m_sceneModified) {
        // TODO: Prompt save
    }
    getEngine()->setScene(std::make_unique<Scene>());
    m_currentScenePath = "";
    m_sceneModified = false;
}

void Editor::openScene(const std::string& path) {
    // TODO: Implement scene loading
    m_currentScenePath = path;
    m_sceneModified = false;
}

void Editor::saveScene(const std::string& path) {
    // TODO: Implement scene saving
    m_currentScenePath = path;
    m_sceneModified = false;
}

void Editor::setSelectedEntity(Entity* entity) {
    m_selectedEntity = entity;
    m_inspectorPanel->setEntity(entity);
    m_hierarchyPanel->setSelected(entity);
}

} // namespace kevla
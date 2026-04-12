#include "kevla/editor/EditorPanels.h"
#include "kevla/editor/Editor.h"
#include "kevla/Core.h"
#include <imgui.h>

namespace kevla {

// ============================================================
// Scene View
// ============================================================

SceneView::SceneView() {
    m_camera = new Camera();
    m_camera->setPosition({ 0, 5, -10 });
    m_camera->setRotation({ 20, 0, 0 });
}

void SceneView::render() {
    ImGui::Begin("Scene", nullptr, ImGuiWindowFlags_NoCollapse);
    
    auto* engine = getEngine();
    if (engine) {
        auto* scene = engine->getScene();
        if (scene) {
            scene->setActiveCamera(m_camera);
        }
    }
    
    ImVec2 viewportSize = ImGui::GetContentRegionAvail();
    ImGui::Text("Viewport: %.0f x %.0f", viewportSize.x, viewportSize.y);
    
    ImGui::End();
}

// ============================================================
// Hierarchy Panel
// ============================================================

HierarchyPanel::HierarchyPanel() {
}

void HierarchyPanel::render() {
    ImGui::Begin("Hierarchy", nullptr, ImGuiWindowFlags_NoCollapse);
    
    auto* engine = getEngine();
    if (!engine) {
        ImGui::End();
        return;
    }
    
    auto* scene = engine->getScene();
    if (!scene) {
        ImGui::Text("No scene");
        ImGui::End();
        return;
    }
    
    int nodeId = 0;
    scene->forEachEntity([this, &nodeId](Entity* entity) {
        if (!entity->getParent()) {
            renderEntityTree(entity, nodeId);
        }
    });
    
    ImGui::End();
}

void HierarchyPanel::update() {
    // Update selection state
}

void HierarchyPanel::renderEntityTree(Entity* entity, int& nodeId) {
    ImGui::PushID(nodeId++);
    
    bool isSelected = (m_selected == entity);
    
    if (entity->getChildren().empty()) {
        if (ImGui::Selectable(entity->getName().c_str(), isSelected)) {
            auto* editor = dynamic_cast<Editor*>(getEngine()); // TODO: proper way
            if (editor) {
                editor->setSelectedEntity(entity);
            }
        }
    } else {
        bool open = ImGui::TreeNode(entity->getName().c_str());
        
        if (ImGui::IsItemClicked()) {
            auto* editor = dynamic_cast<Editor*>(getEngine()); // TODO
            if (editor) {
                editor->setSelectedEntity(entity);
            }
        }
        
        if (open) {
            for (auto* child : entity->getChildren()) {
                renderEntityTree(child, nodeId);
            }
            ImGui::TreePop();
        }
    }
    
    ImGui::PopID();
}

void HierarchyPanel::setSelected(Entity* entity) {
    m_selected = entity;
}

// ============================================================
// Inspector Panel
// ============================================================

InspectorPanel::InspectorPanel() {
}

void InspectorPanel::render() {
    ImGui::Begin("Inspector", nullptr, ImGuiWindowFlags_NoCollapse);
    
    if (!m_entity) {
        ImGui::Text("No entity selected");
        ImGui::End();
        return;
    }
    
    // Entity name
    std::string name = m_entity->getName();
    char buffer[256];
    strncpy(buffer, name.c_str(), sizeof(buffer));
    buffer[sizeof(buffer) - 1] = 0;
    
    if (ImGui::InputText("Name", buffer, sizeof(buffer))) {
        m_entity->setName(buffer);
    }
    
    // Active checkbox
    bool active = m_entity->isActive();
    if (ImGui::Checkbox("Active", &active)) {
        m_entity->setActive(active);
    }
    
    ImGui::Separator();
    
    // Transform
    if (ImGui::CollapsingHeader("Transform", ImGuiTreeNodeFlags_DefaultOpen)) {
        renderTransform();
    }
    
    // Components
    if (ImGui::CollapsingHeader("Components")) {
        renderComponents();
    }
    
    ImGui::End();
}

void InspectorPanel::update() {
}

void InspectorPanel::setEntity(Entity* entity) {
    m_entity = entity;
}

void InspectorPanel::renderTransform() {
    auto& transform = m_entity->getTransform();
    
    Vector3 pos = transform.position;
    if (ImGui::DragFloat3("Position", &pos.x, 0.1f)) {
        transform.position = pos;
    }
    
    Vector3 rot = transform.rotation;
    if (ImGui::DragFloat3("Rotation", &rot.x, 1.0f)) {
        transform.rotation = rot;
    }
    
    Vector3 scale = transform.scale;
    if (ImGui::DragFloat3("Scale", &scale.x, 0.1f)) {
        transform.scale = scale;
    }
}

void InspectorPanel::renderComponents() {
    ImGui::Text("Add Component:");
    ImGui::SameLine();
    
    if (ImGui::Button("Mesh")) {
        // TODO: Add mesh component
    }
    
    ImGui::SameLine();
    
    if (ImGui::Button("Light")) {
        // TODO: Add light component
    }
    
    ImGui::SameLine();
    
    if (ImGui::Button("Camera")) {
        // TODO: Add camera component
    }
}

// ============================================================
// Toolbar Panel
// ============================================================

ToolbarPanel::ToolbarPanel() {
}

void ToolbarPanel::render() {
    ImGui::Begin("Toolbar", nullptr, ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoScrollbar);
    
    const char* tools[] = { "Select", "Move", "Rotate", "Scale" };
    
    for (int i = 0; i < 4; i++) {
        if (i > 0) ImGui::SameLine();
        
        bool isSelected = (m_currentTool == static_cast<Tool>(i));
        
        if (ImGui::RadioButton(tools[i], isSelected)) {
            m_currentTool = static_cast<Tool>(i);
        }
    }
    
    ImGui::End();
}

} // namespace kevla
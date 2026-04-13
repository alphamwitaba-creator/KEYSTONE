#include "kevla/editor/SculptPanel.h"
#include "kevla/sculpt/Sculpt.h"

namespace kevla {

// ============================================================
// SculptPanel Implementation
// ============================================================

SculptPanel::SculptPanel()
    : m_active(false)
    , m_selectedTool(0)
{
}

SculptPanel::~SculptPanel() {
    shutdown();
}

void SculptPanel::initialize() {
    m_sculptSystem = std::make_unique<SculptSystem>();
    m_sculptSystem->initialize();
    m_active = true;
}

void SculptPanel::shutdown() {
    m_sculptSystem.reset();
    m_active = false;
}

void SculptPanel::render() {
    if (!m_active) return;
    
    renderToolbar();
    renderBrushSettings();
    renderLayers();
    renderSymmetrySettings();
    renderToolOptions();
}

void SculptPanel::update(float deltaTime) {
    (void)deltaTime;
}

void SculptPanel::renderToolbar() {
}

void SculptPanel::renderBrushSettings() {
}

void SculptPanel::renderLayers() {
}

void SculptPanel::renderSymmetrySettings() {
}

void SculptPanel::renderToolOptions() {
}

// ============================================================
// SculptView Implementation
// ============================================================

SculptView::SculptView()
    : m_sculptSystem(nullptr)
    , m_viewMode(ViewMode::Perspective)
    , m_cameraDistance(5.0f)
    , m_cameraAngleX(0.0f)
    , m_cameraAngleY(0.0f)
    , m_orbitMode(false)
    , m_lastMouseX(0.0f)
    , m_lastMouseY(0.0f)
    , m_brushSize(1.0f)
    , m_brushStrength(0.5f)
    , m_showGrid(true)
    , m_showWireframe(false)
    , m_doubleSided(false)
    , m_clipStart(0.1f)
    , m_clipEnd(100.0f)
{
}

void SculptView::initialize() {
}

void SculptView::shutdown() {
}

void SculptView::render() {
    if (m_showGrid) {
        renderGrid();
    }
    
    if (m_sculptSystem) {
        renderSculptMesh();
    }
}

void SculptView::update(float deltaTime) {
    (void)deltaTime;
    updateCamera();
}

void SculptView::updateCamera() {
}

void SculptView::renderGrid() {
}

void SculptView::renderSculptMesh() {
    if (m_sculptSystem) {
        m_sculptSystem->render(nullptr);
    }
}

void SculptView::handleMouseDown(float x, float y, int button) {
    m_lastMouseX = x;
    m_lastMouseY = y;
    
    if (button == 0 && m_sculptSystem) {
        Vector3 position = {x, y, 0};
        m_sculptSystem->beginStroke(position, 1.0f);
        m_orbitMode = true;
    }
}

void SculptView::handleMouseMove(float x, float y) {
    float deltaX = x - m_lastMouseX;
    float deltaY = y - m_lastMouseY;
    
    if (m_orbitMode && m_sculptSystem) {
        Vector3 position = {x, y, 0};
        m_sculptSystem->updateStroke(position, 1.0f);
    }
    
    m_lastMouseX = x;
    m_lastMouseY = y;
}

void SculptView::handleMouseUp(int button) {
    if (button == 0 && m_sculptSystem) {
        m_sculptSystem->endStroke();
        m_orbitMode = false;
    }
}

void SculptView::handleScroll(float delta) {
    m_cameraDistance += delta * 0.1f;
    if (m_cameraDistance < 0.5f) m_cameraDistance = 0.5f;
    if (m_cameraDistance > 50.0f) m_cameraDistance = 50.0f;
}

void SculptView::setBrushSize(float size) {
    m_brushSize = size;
    if (m_sculptSystem) {
        m_sculptSystem->setBrushRadius(size);
    }
}

void SculptView::setBrushStrength(float strength) {
    m_brushStrength = strength;
    if (m_sculptSystem) {
        m_sculptSystem->setBrushStrength(strength);
    }
}

// ============================================================
// SculptModeManager Implementation
// ============================================================

SculptModeManager::SculptModeManager()
    : m_inSculptMode(false)
{
}

void SculptModeManager::enterSculptMode() {
    if (!m_panel) {
        m_panel = std::make_unique<SculptPanel>();
        m_panel->initialize();
    }
    
    if (!m_view) {
        m_view = std::make_unique<SculptView>();
        m_view->initialize();
    }
    
    if (m_panel && m_view) {
        m_view->setSculptSystem(m_panel->getSculptSystem());
    }
    
    m_inSculptMode = true;
}

void SculptModeManager::exitSculptMode() {
    if (m_view) {
        m_view->shutdown();
    }
    if (m_panel) {
        m_panel->shutdown();
    }
    m_inSculptMode = false;
}

} // namespace kevla
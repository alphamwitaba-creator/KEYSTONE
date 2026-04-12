#include "kevla/Core.h"
#include "kevla/render/Renderer.h"
#include "kevla/physics/PhysicsWorld.h"

namespace kevla {

static Engine* g_engine = nullptr;

Engine* getEngine() { return g_engine; }
void setEngine(Engine* engine) { g_engine = engine; }

Engine::Engine() {
    setEngine(this);
    m_renderer = std::make_unique<Renderer>();
    m_physics = std::make_unique<PhysicsWorld>();
}

Engine::~Engine() {
    shutdown();
    setEngine(nullptr);
}

void Engine::initialize() {
    KEVLA_INFO("Initializing KEVLA Engine v{}", m_version);
    
    // Initialize renderer
    if (m_renderer) {
        m_renderer->initialize();
    }
    
    // Initialize physics
    if (m_physics) {
        m_physics->initialize();
    }
    
    // Create default scene
    m_scene = std::make_unique<Scene>();
    m_scene->setName("Main Scene");
    
    m_running = true;
    KEVLA_INFO("KEVLA Engine initialized successfully");
}

void Engine::shutdown() {
    KEVLA_INFO("Shutting down KEVLA Engine");
    
    if (m_physics) {
        m_physics->shutdown();
    }
    
    if (m_renderer) {
        m_renderer->shutdown();
    }
    
    m_scene.reset();
    m_running = false;
}

void Engine::update(float deltaTime) {
    if (!m_running || m_paused) return;
    
    m_deltaTime = deltaTime;
    m_totalTime += deltaTime;
    
    updateFrameTime();
    
    // Update physics
    if (m_physics) {
        m_physics->update(deltaTime);
    }
    
    // Update scene
    if (m_scene) {
        m_scene->forEachEntity([deltaTime](Entity* entity) {
            if (entity->isActive()) {
                // TODO: Call entity update systems
            }
        });
    }
}

void Engine::render() {
    if (!m_renderer || !m_scene) return;
    
    m_renderer->beginFrame();
    
    // Render scene
    auto* camera = m_scene->getActiveCamera();
    if (camera) {
        m_renderer->renderScene(m_scene.get(), camera);
    }
    
    // Render editor UI
    // (handled by editor)
    
    m_renderer->endFrame();
}

void Engine::setScene(std::unique_ptr<Scene> scene) {
    m_scene = std::move(scene);
}

void Engine::setWindowSize(int width, int height) {
    m_windowWidth = width;
    m_windowHeight = height;
    if (m_renderer) {
        m_renderer->setViewport(width, height);
    }
}

void Engine::updateFrameTime() {
    m_frameTimeAccumulator += m_deltaTime;
    m_frameCount++;
    
    if (m_frameTimeAccumulator >= 1.0f) {
        m_fps = static_cast<float>(m_frameCount) / m_frameTimeAccumulator;
        m_frameCount = 0;
        m_frameTimeAccumulator = 0.0f;
    }
}

} // namespace kevla
#pragma once

#include "Types.h"
#include "Entity.h"
#include "Scene.h"
#include "Logger.h"

namespace kevla {

// ============================================================
// Core Engine Class
// ============================================================

class Engine {
public:
    Engine();
    ~Engine();
    
    // Lifecycle
    void initialize();
    void shutdown();
    void update(float deltaTime);
    void render();
    
    // Scene management
    Scene* getScene() const { return m_scene.get(); }
    void setScene(std::unique_ptr<Scene> scene);
    
    // Window properties
    int getWindowWidth() const { return m_windowWidth; }
    int getWindowHeight() const { return m_windowHeight; }
    void setWindowSize(int width, int height);
    
    // Running state
    bool isRunning() const { return m_running; }
    void setRunning(bool running) { m_running = running; }
    
    // Delta time
    float getDeltaTime() const { return m_deltaTime; }
    float getTotalTime() const { return m_totalTime; }
    
    // FPS
    float getFPS() const { return m_fps; }
    
    // Engine info
    const std::string& getVersion() const { return m_version; }
    const std::string& getPlatform() const { return m_platform; }
    
private:
    void updateFrameTime();
    
    // Core systems
    std::unique_ptr<Scene> m_scene;
    std::unique_ptr<class Renderer> m_renderer;
    std::unique_ptr<class PhysicsWorld> m_physics;
    
    // Window
    int m_windowWidth = 1280;
    int m_windowHeight = 720;
    
    // Time
    float m_deltaTime = 0.0f;
    float m_totalTime = 0.0f;
    float m_fps = 0.0f;
    float m_frameTimeAccumulator = 0.0f;
    int m_frameCount = 0;
    
    // State
    bool m_running = false;
    bool m_paused = false;
    
    // Info
    std::string m_version = "2.0.0";
    std::string m_platform = "Windows";
};

// Singleton accessor
Engine* getEngine();
void setEngine(Engine* engine);

} // namespace kevla
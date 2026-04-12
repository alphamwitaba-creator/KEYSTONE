#pragma once

#include <string>
#include <vector>
#include <memory>
#include <GLFW/glfw3.h>

namespace kevla {

// ============================================================
// Camera
// ============================================================

class Camera {
public:
    enum class Type {
        Perspective,
        Orthographic
    };
    
    Camera();
    ~Camera() = default;
    
    void setPosition(const Vector3& pos);
    void setRotation(const Vector3& rot);
    void lookAt(const Vector3& target);
    
    Vector3 getPosition() const { return m_position; }
    Vector3 getRotation() const { return m_rotation; }
    
    void setFOV(float fov) { m_fov = fov; }
    float getFOV() const { return m_fov; }
    
    void setNear(float near) { m_near = near; }
    void setFar(float far) { m_far = far; }
    float getNear() const { return m_near; }
    float getFar() const { return m_far; }
    
    void setType(Type type) { m_type = type; }
    Type getType() const { return m_type; }
    
    Matrix4 getProjectionMatrix(float aspect) const;
    Matrix4 getViewMatrix() const;
    
    Vector3 forward() const;
    Vector3 up() const;
    Vector3 right() const;
    
private:
    Type m_type = Type::Perspective;
    Vector3 m_position = { 0, 5, -10 };
    Vector3 m_rotation = { 20, 0, 0 };  // Euler angles in degrees
    
    float m_fov = 60.0f;
    float m_near = 0.1f;
    float m_far = 1000.0f;
};

// ============================================================
// Renderer
// ============================================================

class Renderer {
public:
    Renderer();
    ~Renderer();
    
    void initialize();
    void shutdown();
    
    void setViewport(int width, int height);
    
    void beginFrame();
    void endFrame();
    
    void renderScene(Scene* scene, Camera* camera);
    
    // Drawing
    void drawMesh(class Mesh* mesh, const Matrix4& transform, class Material* material);
    void drawWireframe(class Mesh* mesh, const Matrix4& transform, const Color& color);
    void drawLine(const Vector3& start, const Vector3& end, const Color& color);
    void drawAxis(const Vector3& position, float size = 1.0f);
    
    // Gizmos
    void setShowGizmos(bool show) { m_showGizmos = show; }
    bool getShowGizmos() const { return m_showGizmos; }
    
    // Debug rendering
    void drawBox(const Vector3& center, const Vector3& size, const Color& color);
    void drawSphere(const Vector3& center, float radius, const Color& color);
    
    // Stats
    struct Stats {
        int drawCalls = 0;
        int triangles = 0;
        int vertices = 0;
    };
    
    const Stats& getStats() const { return m_stats; }
    void resetStats() { m_stats = {}; }
    
private:
    void renderGeometry();
    void renderGizmos();
    
    GLFWwindow* m_window = nullptr;
    int m_viewportWidth = 1280;
    int m_viewportHeight = 720;
    
    bool m_showGizmos = true;
    bool m_initialized = false;
    
    Stats m_stats;
    
    // Default shaders
    class Shader* m_litShader = nullptr;
    class Shader* m_unlitShader = nullptr;
    class Shader* m_wireframeShader = nullptr;
};

} // namespace kevla
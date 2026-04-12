#include "kevla/render/Renderer.h"
#include "kevla/Scene.h"
#include "kevla/Logger.h"

#ifdef KEVLA_PLATFORM_WINDOWS
    #include <GL/gl.h>
#else
    #include <OpenGL/gl.h>
#endif

namespace kevla {

// ============================================================
// Camera Implementation
// ============================================================

Camera::Camera()
    : m_type(Type::Perspective)
    , m_position(0, 5, -10)
    , m_rotation(20, 0, 0)
    , m_fov(60.0f)
    , m_near(0.1f)
    , m_far(1000.0f)
{
}

void Camera::setPosition(const Vector3& pos) {
    m_position = pos;
}

void Camera::setRotation(const Vector3& rot) {
    m_rotation = rot;
}

void Camera::lookAt(const Vector3& target) {
    Vector3 forward = (target - m_position).normalized();
    m_rotation.x = math::toDegrees(std::atan2(forward.y, std::sqrt(forward.x * forward.x + forward.z * forward.z)));
    m_rotation.y = math::toDegrees(std::atan2(-forward.x, -forward.z));
}

Matrix4 Camera::getProjectionMatrix(float aspect) const {
    if (m_type == Type::Perspective) {
        return Matrix4::Perspective(math::toRadians(m_fov), aspect, m_near, m_far);
    }
    float size = m_far / 2.0f;
    return Matrix4::Orthographic(-size * aspect, size * aspect, -size, size, m_near, m_far);
}

Matrix4 Camera::getViewMatrix() const {
    Vector3 target = m_position + forward();
    return Matrix4::LookAt(m_position, target, up());
}

Vector3 Camera::forward() const {
    float pitch = math::toRadians(m_rotation.x);
    float yaw = math::toRadians(m_rotation.y);
    return {
        -std::sin(yaw) * std::cos(pitch),
        std::sin(pitch),
        -std::cos(yaw) * std::cos(pitch)
    }.normalized();
}

Vector3 Camera::up() const {
    return Vector3::Up();
}

Vector3 Camera::right() const {
    return forward().cross(up()).normalized();
}

// ============================================================
// Renderer Implementation
// ============================================================

Renderer::Renderer()
    : m_window(nullptr)
    , m_viewportWidth(1280)
    , m_viewportHeight(720)
    , m_showGizmos(true)
    , m_initialized(false)
{
}

Renderer::~Renderer() {
    shutdown();
}

void Renderer::initialize() {
    if (m_initialized) return;

    glEnable(GL_DEPTH_TEST);
    glEnable(GL_CULL_FACE);
    glCullFace(GL_BACK);
    glFrontFace(GL_CW);

    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);

    m_initialized = true;
    KEVLA_INFO("Renderer initialized");
}

void Renderer::shutdown() {
    if (!m_initialized) return;

    m_initialized = false;
    KEVLA_INFO("Renderer shutdown");
}

void Renderer::setViewport(int width, int height) {
    m_viewportWidth = width;
    m_viewportHeight = height;
    glViewport(0, 0, width, height);
}

void Renderer::beginFrame() {
    resetStats();

    glClearColor(0.1f, 0.1f, 0.15f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
}

void Renderer::endFrame() {
    glFlush();
}

void Renderer::renderScene(Scene* scene, Camera* camera) {
    if (!scene || !camera) return;

    renderGeometry();
    if (m_showGizmos) {
        renderGizmos();
    }
}

void Renderer::renderGeometry() {
}

void Renderer::renderGizmos() {
    drawAxis(Vector3::Zero(), 1.0f);
}

void Renderer::drawMesh(Mesh* mesh, const Matrix4& transform, Material* material) {
    (void)mesh;
    (void)transform;
    (void)material;
    m_stats.drawCalls++;
}

void Renderer::drawWireframe(Mesh* mesh, const Matrix4& transform, const Color& color) {
    (void)mesh;
    (void)transform;
    (void)color;
    m_stats.drawCalls++;
}

void Renderer::drawLine(const Vector3& start, const Vector3& end, const Color& color) {
    (void)start;
    (void)end;
    (void)color;
}

void Renderer::drawAxis(const Vector3& position, float size) {
    drawLine(position, position + Vector3::Right() * size, Color::Red());
    drawLine(position, position + Vector3::Up() * size, Color::Green());
    drawLine(position, position + Vector3::Forward() * size, Color::Blue());
}

void Renderer::drawBox(const Vector3& center, const Vector3& size, const Color& color) {
    (void)center;
    (void)size;
    (void)color;
}

void Renderer::drawSphere(const Vector3& center, float radius, const Color& color) {
    (void)center;
    (void)radius;
    (void)color;
}

} // namespace kevla
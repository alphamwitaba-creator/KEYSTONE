#pragma once

#include <vector>
#include <string>
#include <functional>
#include "kevla/Vector.h"
#include "kevla/Matrix.h"

namespace kevla {

// ============================================================
// Editor Gizmos - Transform manipulation tools
// ============================================================

enum class GizmoMode {
    Translate,  // Move
    Rotate,     // Rotate
    Scale       // Scale
};

enum class GizmoSpace {
    Local,
    World
};

enum class GizmoAxis {
    X,
    Y,
    Z,
    XY,
    XZ,
    YZ,
    XYZ
};

class Gizmo {
public:
    Gizmo();
    ~Gizmo() = default;
    
    void setMode(GizmoMode mode) { m_mode = mode; }
    GizmoMode getMode() const { return m_mode; }
    
    void setSpace(GizmoSpace space) { m_space = space; }
    GizmoSpace getSpace() const { return m_space; }
    
    void setTarget(Entity* entity) { m_target = entity; }
    Entity* getTarget() const { return m_target; }
    
    void setSnap(float translate, float rotate, float scale) {
        m_translateSnap = translate;
        m_rotateSnap = rotate;
        m_scaleSnap = scale;
    }
    
    // Update and check for interaction
    bool update(const Vector2& mousePos, const Matrix4& viewProjection, const Vector2& viewportSize);
    
    // Apply transformation to target
    void apply();
    
    // Get current transformation delta
    Vector3 getTranslationDelta() const { return m_translationDelta; }
    Vector3 getRotationDelta() const { return m_rotationDelta; }
    Vector3 getScaleDelta() const { return m_scaleDelta; }
    
    // Rendering
    void render(class Renderer* renderer);
    
private:
    GizmoMode m_mode = GizmoMode::Translate;
    GizmoSpace m_space = GizmoSpace::Local;
    Entity* m_target = nullptr;
    
    // Snapping
    float m_translateSnap = 0.0f;
    float m_rotateSnap = 0.0f;
    float m_scaleSnap = 0.0f;
    
    // Interaction state
    GizmoAxis m_activeAxis = GizmoAxis::XYZ;
    bool m_isDragging = false;
    Vector3 m_translationDelta = Vector3::Zero();
    Vector3 m_rotationDelta = Vector3::Zero();
    Vector3 m_scaleDelta = Vector3::One();
    
    // Internal methods
    float screenToWorld(const Vector2& screenPos, const Matrix4& viewProj);
    Vector3 getAxisVector(GizmoAxis axis) const;
};

// ============================================================
// Gizmo Renderer (simplified)
// ============================================================

class GizmoRenderer {
public:
    static void renderAxis(const Vector3& origin, const Vector3& direction, float length, const Color& color, float thickness);
    static void renderRing(const Vector3& origin, const Vector3& normal, float radius, const Color& color);
    static void renderBox(const Vector3& center, const Vector3& size, const Color& color);
    static void renderArrow(const Vector3& start, const Vector3& end, const Color& color);
};

} // namespace kevla
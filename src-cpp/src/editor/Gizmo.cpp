#include "kevla/editor/Gizmo.h"
#include "kevla/Entity.h"
#include "kevla/Transform.h"
#include "kevla/render/Renderer.h"

namespace kevla {

Gizmo::Gizmo()
    : m_mode(GizmoMode::Translate)
    , m_space(GizmoSpace::Local)
    , m_target(nullptr)
    , m_translateSnap(0.0f)
    , m_rotateSnap(0.0f)
    , m_scaleSnap(0.0f)
    , m_activeAxis(GizmoAxis::XYZ)
    , m_isDragging(false)
    , m_translationDelta(Vector3::Zero())
    , m_rotationDelta(Vector3::Zero())
    , m_scaleDelta(Vector3::One())
{
}

bool Gizmo::update(const Vector2& mousePos, const Matrix4& viewProjection, const Vector2& viewportSize) {
    if (!m_target) {
        return false;
    }

    Transform* transform = m_target->getTransform();
    if (!transform) {
        return false;
    }

    Matrix4 modelMatrix = transform->getWorldMatrix();
    Vector3 position = transform->getPosition();

    Vector4 projected = viewProjection * Vector4(position, 1.0f);
    if (projected.w <= 0.0f) {
        return false;
    }

    Vector2 gizmoScreenPos(projected.x / projected.w, projected.y / projected.w);
    gizmoScreenPos.x = (gizmoScreenPos.x + 1.0f) * 0.5f * viewportSize.x;
    gizmoScreenPos.y = (1.0f - gizmoScreenPos.y) * 0.5f * viewportSize.y;

    Vector2 delta = mousePos - gizmoScreenPos;
    float dist = delta.length();

    if (m_isDragging) {
        float sensitivity = 0.01f;

        if (m_mode == GizmoMode::Translate) {
            Vector3 deltaWorld;

            switch (m_activeAxis) {
                case GizmoAxis::X:
                    deltaWorld.x = delta.x * sensitivity;
                    break;
                case GizmoAxis::Y:
                    deltaWorld.y = delta.y * sensitivity;
                    break;
                case GizmoAxis::Z:
                    deltaWorld.z = -delta.y * sensitivity;
                    break;
                case GizmoAxis::XY:
                    deltaWorld.x = delta.x * sensitivity;
                    deltaWorld.y = delta.y * sensitivity;
                    break;
                case GizmoAxis::XZ:
                    deltaWorld.x = delta.x * sensitivity;
                    deltaWorld.z = -delta.y * sensitivity;
                    break;
                case GizmoAxis::YZ:
                    deltaWorld.y = delta.y * sensitivity;
                    deltaWorld.z = -delta.y * sensitivity;
                    break;
                case GizmoAxis::XYZ:
                    deltaWorld.x = delta.x * sensitivity;
                    deltaWorld.y = delta.y * sensitivity;
                    break;
            }

            if (m_translateSnap > 0.0f) {
                deltaWorld.x = std::round(deltaWorld.x / m_translateSnap) * m_translateSnap;
                deltaWorld.y = std::round(deltaWorld.y / m_translateSnap) * m_translateSnap;
                deltaWorld.z = std::round(deltaWorld.z / m_translateSnap) * m_translateSnap;
            }

            m_translationDelta = deltaWorld;
        }
        else if (m_mode == GizmoMode::Rotate) {
            Vector3 deltaRot;

            switch (m_activeAxis) {
                case GizmoAxis::X:
                    deltaRot.x = delta.y * sensitivity * 10.0f;
                    break;
                case GizmoAxis::Y:
                    deltaRot.y = delta.y * sensitivity * 10.0f;
                    break;
                case GizmoAxis::Z:
                    deltaRot.z = delta.y * sensitivity * 10.0f;
                    break;
                default:
                    break;
            }

            if (m_rotateSnap > 0.0f) {
                deltaRot.x = std::round(deltaRot.x / m_rotateSnap) * m_rotateSnap;
                deltaRot.y = std::round(deltaRot.y / m_rotateSnap) * m_rotateSnap;
                deltaRot.z = std::round(deltaRot.z / m_rotateSnap) * m_rotateSnap;
            }

            m_rotationDelta = deltaRot;
        }
        else if (m_mode == GizmoMode::Scale) {
            Vector3 deltaScale;

            float scaleFactor = 1.0f + delta.x * sensitivity;

            switch (m_activeAxis) {
                case GizmoAxis::X:
                    deltaScale.x = scaleFactor;
                    break;
                case GizmoAxis::Y:
                    deltaScale.y = scaleFactor;
                    break;
                case GizmoAxis::Z:
                    deltaScale.z = scaleFactor;
                    break;
                default:
                    deltaScale = Vector3(scaleFactor, scaleFactor, scaleFactor);
                    break;
            }

            if (m_scaleSnap > 0.0f) {
                deltaScale.x = std::round(deltaScale.x / m_scaleSnap) * m_scaleSnap;
                deltaScale.y = std::round(deltaScale.y / m_scaleSnap) * m_scaleSnap;
                deltaScale.z = std::round(deltaScale.z / m_scaleSnap) * m_scaleSnap;
            }

            m_scaleDelta = deltaScale;
        }

        apply();
        return true;
    }

    float hitRadius = 20.0f;
    if (dist < hitRadius) {
        if (m_mode == GizmoMode::Translate) {
            if (delta.x > delta.y * 0.5f) m_activeAxis = GizmoAxis::X;
            else if (delta.y > delta.x * 0.5f) m_activeAxis = GizmoAxis::Y;
            else m_activeAxis = GizmoAxis::Z;
        }
        else if (m_mode == GizmoMode::Rotate) {
            if (std::abs(delta.x) > std::abs(delta.y)) m_activeAxis = GizmoAxis::Y;
            else m_activeAxis = GizmoAxis::X;
        }
        else if (m_mode == GizmoMode::Scale) {
            if (delta.x > 0.0f) m_activeAxis = GizmoAxis::X;
            else m_activeAxis = GizmoAxis::XYZ;
        }
    }

    return false;
}

void Gizmo::apply() {
    if (!m_target) return;

    Transform* transform = m_target->getTransform();
    if (!transform) return;

    if (m_mode == GizmoMode::Translate && m_translationDelta != Vector3::Zero()) {
        Vector3 newPos = transform->getPosition() + m_translationDelta;
        transform->setPosition(newPos);
        m_translationDelta = Vector3::Zero();
    }
    else if (m_mode == GizmoMode::Rotate && m_rotationDelta != Vector3::Zero()) {
        Vector3 newRot = transform->getRotation() + m_rotationDelta;
        transform->setRotation(newRot);
        m_rotationDelta = Vector3::Zero();
    }
    else if (m_mode == GizmoMode::Scale && m_scaleDelta != Vector3::One()) {
        Vector3 newScale = transform->getScale() * m_scaleDelta;
        transform->setScale(newScale);
        m_scaleDelta = Vector3::One();
    }
}

void Gizmo::render(class Renderer* renderer) {
    if (!renderer || !m_target) return;

    Transform* transform = m_target->getTransform();
    if (!transform) return;

    Vector3 position = transform->getPosition();

    float axisLength = 2.0f;
    float lineWidth = 2.0f;

    if (m_mode == GizmoMode::Translate) {
        Color colorX(1.0f, 0.3f, 0.3f);
        Color colorY(0.3f, 1.0f, 0.3f);
        Color colorZ(0.3f, 0.3f, 1.0f);

        if (m_activeAxis == GizmoAxis::X || m_activeAxis == GizmoAxis::XY || m_activeAxis == GizmoAxis::XZ || m_activeAxis == GizmoAxis::XYZ) {
            GizmoRenderer::renderArrow(position, position + Vector3(axisLength, 0, 0), colorX);
        }
        if (m_activeAxis == GizmoAxis::Y || m_activeAxis == GizmoAxis::XY || m_activeAxis == GizmoAxis::YZ || m_activeAxis == GizmoAxis::XYZ) {
            GizmoRenderer::renderArrow(position, position + Vector3(0, axisLength, 0), colorY);
        }
        if (m_activeAxis == GizmoAxis::Z || m_activeAxis == GizmoAxis::XZ || m_activeAxis == GizmoAxis::YZ || m_activeAxis == GizmoAxis::XYZ) {
            GizmoRenderer::renderArrow(position, position + Vector3(0, 0, axisLength), colorZ);
        }
    }
    else if (m_mode == GizmoMode::Rotate) {
        float radius = 1.5f;
        Color colorX(1.0f, 0.3f, 0.3f);
        Color colorY(0.3f, 1.0f, 0.3f);
        Color colorZ(0.3f, 0.3f, 1.0f);

        GizmoRenderer::renderRing(position, Vector3(1, 0, 0), radius, colorX);
        GizmoRenderer::renderRing(position, Vector3(0, 1, 0), radius, colorY);
        GizmoRenderer::renderRing(position, Vector3(0, 0, 1), radius, colorZ);
    }
    else if (m_mode == GizmoMode::Scale) {
        Color colorX(1.0f, 0.3f, 0.3f);
        Color colorY(0.3f, 1.0f, 0.3f);
        Color colorZ(0.3f, 0.3f, 1.0f);
        Color colorXYZ(1.0f, 1.0f, 0.3f);

        GizmoRenderer::renderBox(position, Vector3(axisLength * 0.3f), colorX);
        GizmoRenderer::renderBox(position, Vector3(axisLength * 0.3f), colorY);
        GizmoRenderer::renderBox(position, Vector3(axisLength * 0.3f), colorZ);
    }
}

float Gizmo::screenToWorld(const Vector2& screenPos, const Matrix4& viewProj) {
    (void)screenPos;
    (void)viewProj;
    return 1.0f;
}

Vector3 Gizmo::getAxisVector(GizmoAxis axis) const {
    switch (axis) {
        case GizmoAxis::X: return Vector3(1, 0, 0);
        case GizmoAxis::Y: return Vector3(0, 1, 0);
        case GizmoAxis::Z: return Vector3(0, 0, 1);
        default: return Vector3::Zero();
    }
}

void GizmoRenderer::renderAxis(const Vector3& origin, const Vector3& direction, float length, const Color& color, float thickness) {
    (void)origin;
    (void)direction;
    (void)length;
    (void)color;
    (void)thickness;
}

void GizmoRenderer::renderRing(const Vector3& origin, const Vector3& normal, float radius, const Color& color) {
    (void)origin;
    (void)normal;
    (void)radius;
    (void)color;
}

void GizmoRenderer::renderBox(const Vector3& center, const Vector3& size, const Color& color) {
    (void)center;
    (void)size;
    (void)color;
}

void GizmoRenderer::renderArrow(const Vector3& start, const Vector3& end, const Color& color) {
    (void)start;
    (void)end;
    (void)color;
}

} // namespace kevla
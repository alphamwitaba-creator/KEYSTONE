#include "kevla/physics/Collider.h"

namespace kevla {

Collider::Collider()
    : m_type(ColliderType::Box)
    , m_center(Vector3::Zero())
    , m_size(Vector3::One())
    , m_radius(0.5f)
    , m_height(1.0f)
    , m_isTrigger(false)
    , m_collisionLayer(1)
    , m_mask(1)
{
}

Collider* Collider::createBox(const Vector3& size) {
    auto collider = new Collider();
    collider->m_type = ColliderType::Box;
    collider->m_size = size;
    return collider;
}

Collider* Collider::createSphere(float radius) {
    auto collider = new Collider();
    collider->m_type = ColliderType::Sphere;
    collider->m_radius = radius;
    return collider;
}

Collider* Collider::createCapsule(float radius, float height) {
    auto collider = new Collider();
    collider->m_type = ColliderType::Capsule;
    collider->m_radius = radius;
    collider->m_height = height;
    return collider;
}

Vector3 Collider::getAABBMin() const {
    if (m_body) {
        return m_center - m_size * 0.5f + m_body->getPosition();
    }
    return m_center - m_size * 0.5f;
}

Vector3 Collider::getAABBMax() const {
    if (m_body) {
        return m_center + m_size * 0.5f + m_body->getPosition();
    }
    return m_center + m_size * 0.5f;
}

} // namespace kevla
#include "kevla/physics/RigidBody.h"
#include "kevla/physics/Collider.h"

namespace kevla {

RigidBody::RigidBody()
    : m_type(Type::Dynamic)
    , m_mass(1.0f)
    , m_position(Vector3::Zero())
    , m_rotation(Vector3::Zero())
    , m_linearVelocity(Vector3::Zero())
    , m_angularVelocity(Vector3::Zero())
    , m_linearDamping(0.01f)
    , m_angularDamping(0.01f)
    , m_restitution(0.0f)
    , m_friction(0.5f)
    , m_gravityEnabled(true)
    , m_collisionEnabled(true)
    , m_awake(true)
{
}

void RigidBody::applyForce(const Vector3& force) {
    if (m_type == Type::Dynamic) {
        m_linearVelocity += force / m_mass;
        m_awake = true;
    }
}

void RigidBody::applyTorque(const Vector3& torque) {
    if (m_type == Type::Dynamic) {
        m_angularVelocity += torque;
        m_awake = true;
    }
}

void RigidBody::applyImpulse(const Vector3& impulse) {
    if (m_type == Type::Dynamic) {
        m_linearVelocity += impulse / m_mass;
        m_awake = true;
    }
}

void RigidBody::applyAngularImpulse(const Vector3& impulse) {
    if (m_type == Type::Dynamic) {
        m_angularVelocity += impulse;
        m_awake = true;
    }
}

void RigidBody::addCollider(Collider* collider) {
    if (collider) {
        collider->m_body = this;
        m_colliders.push_back(collider);
    }
}

void RigidBody::removeCollider(Collider* collider) {
    auto it = std::find(m_colliders.begin(), m_colliders.end(), collider);
    if (it != m_colliders.end()) {
        m_colliders.erase(it);
    }
}

void RigidBody::integrate(float deltaTime, const Vector3& gravity) {
    if (m_type != Type::Dynamic || !m_awake) return;

    if (m_gravityEnabled) {
        m_linearVelocity += gravity * deltaTime;
    }

    m_position += m_linearVelocity * deltaTime;

    m_linearVelocity *= (1.0f - m_linearDamping);
    m_angularVelocity *= (1.0f - m_angularDamping);

    if (m_linearVelocity.lengthSquared() < 0.0001f && 
        m_angularVelocity.lengthSquared() < 0.0001f) {
        m_awake = false;
    }
}

void RigidBody::calculateBounds() {
}

} // namespace kevla
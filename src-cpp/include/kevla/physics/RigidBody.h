#pragma once

#include "../Vector.h"

namespace kevla {

// ============================================================
// Rigid Body - Physics object
// ============================================================

class RigidBody {
public:
    enum class Type {
        Dynamic,
        Static,
        Kinematic
    };

    RigidBody();
    ~RigidBody() = default;

    void setType(Type type) { m_type = type; }
    Type getType() const { return m_type; }

    void setMass(float mass) { m_mass = mass; }
    float getMass() const { return m_mass; }

    void setPosition(const Vector3& pos) { m_position = pos; }
    const Vector3& getPosition() const { return m_position; }

    void setRotation(const Vector3& rot) { m_rotation = rot; }
    const Vector3& getRotation() const { return m_rotation; }

    void setLinearVelocity(const Vector3& vel) { m_linearVelocity = vel; }
    const Vector3& getLinearVelocity() const { return m_linearVelocity; }

    void setAngularVelocity(const Vector3& vel) { m_angularVelocity = vel; }
    const Vector3& getAngularVelocity() const { return m_angularVelocity; }

    void setLinearDamping(float damping) { m_linearDamping = damping; }
    float getLinearDamping() const { return m_linearDamping; }

    void setAngularDamping(float damping) { m_angularDamping = damping; }
    float getAngularDamping() const { return m_angularDamping; }

    void setRestitution(float restitution) { m_restitution = restitution; }
    float getRestitution() const { return m_restitution; }

    void setFriction(float friction) { m_friction = friction; }
    float getFriction() const { return m_friction; }

    void setGravityEnabled(bool enabled) { m_gravityEnabled = enabled; }
    bool isGravityEnabled() const { return m_gravityEnabled; }

    void setCollisionEnabled(bool enabled) { m_collisionEnabled = enabled; }
    bool isCollisionEnabled() const { return m_collisionEnabled; }

    void applyForce(const Vector3& force);
    void applyTorque(const Vector3& torque);
    void applyImpulse(const Vector3& impulse);
    void applyAngularImpulse(const Vector3& impulse);

    void setAwake(bool awake) { m_awake = awake; }
    bool isAwake() const { return m_awake; }

    void addCollider(class Collider* collider);
    void removeCollider(class Collider* collider);

    class Entity* getEntity() const { return m_entity; }

private:
    class Entity* m_entity = nullptr;
    Type m_type = Type::Dynamic;
    float m_mass = 1.0f;

    Vector3 m_position = Vector3::Zero();
    Vector3 m_rotation = Vector3::Zero();

    Vector3 m_linearVelocity = Vector3::Zero();
    Vector3 m_angularVelocity = Vector3::Zero();

    float m_linearDamping = 0.01f;
    float m_angularDamping = 0.01f;

    float m_restitution = 0.0f;
    float m_friction = 0.5f;

    bool m_gravityEnabled = true;
    bool m_collisionEnabled = true;
    bool m_awake = true;

    std::vector<class Collider*> m_colliders;

    void integrate(float deltaTime, const Vector3& gravity);
    void calculateBounds();

    friend class PhysicsWorld;
};

} // namespace kevla
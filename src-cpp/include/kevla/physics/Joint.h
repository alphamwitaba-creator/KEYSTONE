#pragma once

#include "../Vector.h"

namespace kevla {

// ============================================================
// Joint Types
// ============================================================

enum class JointType {
    Fixed,
    Hinge,
    Slider,
    Spring,
    BallAndSocket,
    Universal
};

// ============================================================
// Joint - Connection between bodies
// ============================================================

class Joint {
public:
    Joint();
    ~Joint() = default;

    void setType(JointType type) { m_type = type; }
    JointType getType() const { return m_type; }

    void setBodyA(class RigidBody* body) { m_bodyA = body; }
    class RigidBody* getBodyA() const { return m_bodyA; }

    void setBodyB(class RigidBody* body) { m_bodyB = body; }
    class RigidBody* getBodyB() const { return m_bodyB; }

    void setAnchorA(const Vector3& anchor) { m_anchorA = anchor; }
    const Vector3& getAnchorA() const { return m_anchorA; }

    void setAnchorB(const Vector3& anchor) { m_anchorB = anchor; }
    const Vector3& getAnchorB() const { return m_anchorB; }

    void setBreakForce(float force) { m_breakForce = force; }
    float getBreakForce() const { return m_breakForce; }

    void setBreakTorque(float torque) { m_breakTorque = torque; }
    float getBreakTorque() const { return m_breakTorque; }

    void setEnabled(bool enabled) { m_enabled = enabled; }
    bool isEnabled() const { return m_enabled; }

    static Joint* createFixed(class RigidBody* a, class RigidBody* b);
    static Joint* createHinge(class RigidBody* a, class RigidBody* b, const Vector3& axis);
    static Joint* createSpring(class RigidBody* a, class RigidBody* b, float stiffness, float damping);
    static Joint* createBallAndSocket(class RigidBody* a, class RigidBody* b);

    bool isBroken() const { return m_broken; }
    void reset() { m_broken = false; }

private:
    JointType m_type = JointType::Fixed;
    class RigidBody* m_bodyA = nullptr;
    class RigidBody* m_bodyB = nullptr;

    Vector3 m_anchorA = Vector3::Zero();
    Vector3 m_anchorB = Vector3::Zero();

    float m_breakForce = 1000.0f;
    float m_breakTorque = 1000.0f;
    bool m_enabled = true;
    bool m_broken = false;

    Vector3 m_axisA = Vector3::Zero();
    Vector3 m_axisB = Vector3::Zero();
    Vector3 m_perpAxis = Vector3::Zero();

    float m_stiffness = 100.0f;
    float m_damping = 10.0f;
    float m_restLength = 0.0f;

    void solve();

    friend class PhysicsWorld;
};

} // namespace kevla
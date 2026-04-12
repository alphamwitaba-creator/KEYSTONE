#include "kevla/physics/Joint.h"
#include "kevla/physics/RigidBody.h"
#include "kevla/physics/PhysicsWorld.h"
#include <cmath>

namespace kevla {

Joint::Joint()
    : m_type(JointType::Fixed)
    , m_bodyA(nullptr)
    , m_bodyB(nullptr)
    , m_anchorA(Vector3::Zero())
    , m_anchorB(Vector3::Zero())
    , m_breakForce(1000.0f)
    , m_breakTorque(1000.0f)
    , m_enabled(true)
    , m_broken(false)
    , m_stiffness(100.0f)
    , m_damping(10.0f)
    , m_restLength(0.0f)
{
}

Joint* Joint::createFixed(RigidBody* a, RigidBody* b) {
    auto joint = new Joint();
    joint->m_type = JointType::Fixed;
    joint->m_bodyA = a;
    joint->m_bodyB = b;
    return joint;
}

Joint* Joint::createHinge(RigidBody* a, RigidBody* b, const Vector3& axis) {
    auto joint = new Joint();
    joint->m_type = JointType::Hinge;
    joint->m_bodyA = a;
    joint->m_bodyB = b;
    joint->m_axisA = axis;
    return joint;
}

Joint* Joint::createSpring(RigidBody* a, RigidBody* b, float stiffness, float damping) {
    auto joint = new Joint();
    joint->m_type = JointType::Spring;
    joint->m_bodyA = a;
    joint->m_bodyB = b;
    joint->m_stiffness = stiffness;
    joint->m_damping = damping;
    joint->m_restLength = (b->getPosition() - a->getPosition()).length();
    return joint;
}

Joint* Joint::createBallAndSocket(RigidBody* a, RigidBody* b) {
    auto joint = new Joint();
    joint->m_type = JointType::BallAndSocket;
    joint->m_bodyA = a;
    joint->m_bodyB = b;
    return joint;
}

void Joint::solve() {
    if (!m_bodyA || !m_bodyB) return;

    Vector3 anchorWorldA = m_bodyA->getPosition() + m_anchorA;
    Vector3 anchorWorldB = m_bodyB->getPosition() + m_anchorB;

    switch (m_type) {
        case JointType::Fixed: {
            Vector3 delta = anchorWorldB - anchorWorldA;
            float dist = delta.length();

            if (dist > 0.001f) {
                Vector3 correction = delta * 0.5f;
                m_bodyA->m_position += correction;
                m_bodyB->m_position -= correction;
            }
            break;
        }

        case JointType::Spring: {
            Vector3 delta = anchorWorldB - anchorWorldA;
            float dist = delta.length();
            float displacement = dist - m_restLength;

            Vector3 direction = delta.normalized();
            float forceMagnitude = m_stiffness * displacement - m_damping * 
                (m_bodyB->getLinearVelocity() - m_bodyA->getLinearVelocity()).dot(direction);

            Vector3 force = direction * forceMagnitude;

            m_bodyA->applyForce(force);
            m_bodyB->applyForce(-force);
            break;
        }

        case JointType::BallAndSocket: {
            Vector3 delta = anchorWorldB - anchorWorldA;
            float dist = delta.length();

            if (dist > 0.001f) {
                Vector3 correction = delta * 0.5f;
                m_bodyA->m_position += correction;
                m_bodyB->m_position -= correction;
            }
            break;
        }

        case JointType::Hinge:
        case JointType::Slider:
        case JointType::Universal:
            break;
    }
}

} // namespace kevla
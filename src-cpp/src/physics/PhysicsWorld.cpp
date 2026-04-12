#include "kevla/physics/PhysicsWorld.h"
#include "kevla/physics/RigidBody.h"
#include "kevla/physics/Collider.h"
#include "kevla/physics/Joint.h"
#include "kevla/Entity.h"

namespace kevla {

static PhysicsWorld* g_physicsWorld = nullptr;

PhysicsWorld::PhysicsWorld()
    : m_gravity(0, -9.81f, 0)
    , m_solverIterations(4)
    , m_paused(false)
    , m_initialized(false)
{
}

PhysicsWorld::~PhysicsWorld() {
    shutdown();
}

void PhysicsWorld::initialize() {
    if (m_initialized) return;
    m_initialized = true;
    g_physicsWorld = this;
}

void PhysicsWorld::shutdown() {
    if (!m_initialized) return;
    m_bodies.clear();
    m_joints.clear();
    m_initialized = false;
    g_physicsWorld = nullptr;
}

PhysicsWorld* PhysicsWorld::get() {
    return g_physicsWorld;
}

void PhysicsWorld::update(float deltaTime) {
    if (m_paused || !m_initialized) return;

    for (auto& body : m_bodies) {
        if (body->m_type == RigidBody::Type::Dynamic && body->m_awake) {
            body->integrate(deltaTime, m_gravity);
        }
    }

    solveCollisions();
    solveJoints();
}

RigidBody* PhysicsWorld::createRigidBody(Entity* entity) {
    auto body = std::make_unique<RigidBody>();
    body->m_entity = entity;
    RigidBody* ptr = body.get();
    m_bodies.push_back(std::move(body));
    return ptr;
}

void PhysicsWorld::destroyRigidBody(RigidBody* body) {
    auto it = std::find_if(m_bodies.begin(), m_bodies.end(),
        [body](const std::unique_ptr<RigidBody>& b) { return b.get() == body; });
    if (it != m_bodies.end()) {
        m_bodies.erase(it);
    }
}

void PhysicsWorld::addJoint(Joint* joint) {
    m_joints.push_back(std::unique_ptr<Joint>(joint));
}

void PhysicsWorld::removeJoint(Joint* joint) {
    auto it = std::find_if(m_joints.begin(), m_joints.end(),
        [joint](const std::unique_ptr<Joint>& j) { return j.get() == joint; });
    if (it != m_joints.end()) {
        m_joints.erase(it);
    }
}

void PhysicsWorld::raycast(const Vector3& origin, const Vector3& direction, float maxDistance, 
                         std::vector<RaycastHit>& hits) {
    Vector3 dir = direction.normalized();

    for (auto& body : m_bodies) {
        if (body->m_type == RigidBody::Type::Static) continue;

        for (auto* collider : body->m_colliders) {
            Vector3 aabbMin = collider->getAABBMin() + body->m_position;
            Vector3 aabbMax = collider->getAABBMax() + body->m_position;

            float tmin = 0.0f;
            float tmax = maxDistance;

            bool hit = true;

            for (int i = 0; i < 3; i++) {
                if (std::abs(dir.x) < 0.0001f) {
                    if (origin.x < aabbMin.x || origin.x > aabbMax.x) hit = false;
                } else {
                    float t1 = (aabbMin.x - origin.x) / dir.x;
                    float t2 = (aabbMax.x - origin.x) / dir.x;
                    tmin = std::max(tmin, std::min(t1, t2));
                    tmax = std::min(tmax, std::max(t1, t2));
                }
            }

            if (hit && tmin <= tmax && tmin >= 0.0f) {
                RaycastHit rayHit;
                rayHit.body = body.get();
                rayHit.distance = tmin;
                rayHit.position = origin + dir * tmin;
                hits.push_back(rayHit);
            }
        }
    }
}

void PhysicsWorld::solveCollisions() {
    for (size_t i = 0; i < m_bodies.size(); i++) {
        for (size_t j = i + 1; j < m_bodies.size(); j++) {
            RigidBody* a = m_bodies[i].get();
            RigidBody* b = m_bodies[j].get();

            if (!a->m_collisionEnabled || !b->m_collisionEnabled) continue;

            for (auto* colA : a->m_colliders) {
                for (auto* colB : b->m_colliders) {
                    bool collision = false;

                    if (colA->m_type == ColliderType::Box && colB->m_type == ColliderType::Box) {
                        Vector3 posA = a->m_position + colA->m_center;
                        Vector3 posB = b->m_position + colB->m_center;

                        Vector3 halfA = colA->m_size * 0.5f;
                        Vector3 halfB = colB->m_size * 0.5f;

                        Vector3 diff = posB - posA;
                        Vector3 overlap = halfA + halfB - Vector3(std::abs(diff.x), std::abs(diff.y), std::abs(diff.z));

                        if (overlap.x > 0 && overlap.y > 0 && overlap.z > 0) {
                            collision = true;
                        }
                    }
                    else if (colA->m_type == ColliderType::Sphere && colB->m_type == ColliderType::Sphere) {
                        Vector3 posA = a->m_position + colA->m_center;
                        Vector3 posB = b->m_position + colB->m_center;

                        float dist = (posB - posA).length();
                        float minDist = colA->m_radius + colB->m_radius;

                        if (dist < minDist) {
                            collision = true;
                        }
                    }

                    if (collision) {
                        a->setAwake(true);
                        b->setAwake(true);
                    }
                }
            }
        }
    }
}

void PhysicsWorld::solveJoints() {
    for (auto& joint : m_joints) {
        if (joint->m_enabled && !joint->m_broken) {
            joint->solve();
        }
    }
}

} // namespace kevla
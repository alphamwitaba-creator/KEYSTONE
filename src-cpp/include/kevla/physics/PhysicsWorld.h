#pragma once

#include <vector>
#include <memory>
#include <unordered_map>
#include "kevla/Entity.h"

namespace kevla {

// ============================================================
// Physics World - Simulation manager
// ============================================================

class PhysicsWorld {
public:
    PhysicsWorld();
    ~PhysicsWorld();

    void initialize();
    void shutdown();

    void update(float deltaTime);

    void setGravity(const Vector3& gravity) { m_gravity = gravity; }
    const Vector3& getGravity() const { return m_gravity; }

    void setSolverIterations(int iterations) { m_solverIterations = iterations; }
    int getSolverIterations() const { return m_solverIterations; }

    class RigidBody* createRigidBody(class Entity* entity);
    void destroyRigidBody(class RigidBody* body);

    void addJoint(class Joint* joint);
    void removeJoint(class Joint* joint);

    void raycast(const Vector3& origin, const Vector3& direction, float maxDistance, 
                std::vector<class RaycastHit>& hits);

    void setPaused(bool paused) { m_paused = paused; }
    bool isPaused() const { return m_paused; }

    static PhysicsWorld* get();

private:
    Vector3 m_gravity = { 0, -9.81f, 0 };
    int m_solverIterations = 4;
    bool m_paused = false;
    bool m_initialized = false;

    std::vector<std::unique_ptr<class RigidBody>> m_bodies;
    std::vector<std::unique_ptr<class Joint>> m_joints;

    void solveCollisions();
    void solveJoints();
};

// ============================================================
// Raycast Hit Result
// ============================================================

struct RaycastHit {
    class RigidBody* body = nullptr;
    Vector3 position;
    Vector3 normal;
    float distance = 0.0f;
};

} // namespace kevla
#pragma once

#include "../Vector.h"

namespace kevla {

// ============================================================
// Collider Shapes
// ============================================================

enum class ColliderType {
    Box,
    Sphere,
    Capsule,
    Mesh
};

// ============================================================
// Collider - Collision shape
// ============================================================

class Collider {
public:
    Collider();
    ~Collider() = default;

    void setType(ColliderType type) { m_type = type; }
    ColliderType getType() const { return m_type; }

    void setCenter(const Vector3& center) { m_center = center; }
    const Vector3& getCenter() const { return m_center; }

    void setSize(const Vector3& size) { m_size = size; }
    const Vector3& getSize() const { return m_size; }

    void setRadius(float radius) { m_radius = radius; }
    float getRadius() const { return m_radius; }

    void setHeight(float height) { m_height = height; }
    float getHeight() const { return m_height; }

    void setIsTrigger(bool isTrigger) { m_isTrigger = isTrigger; }
    bool isTrigger() const { return m_isTrigger; }

    void setCollisionLayer(int layer) { m_collisionLayer = layer; }
    int getCollisionLayer() const { return m_collisionLayer; }

    void setMask(int mask) { m_mask = mask; }
    int getMask() const { return m_mask; }

    static Collider* createBox(const Vector3& size);
    static Collider* createSphere(float radius);
    static Collider* createCapsule(float radius, float height);

    Vector3 getAABBMin() const;
    Vector3 getAABBMax() const;

    class RigidBody* getBody() const { return m_body; }

private:
    RigidBody* m_body = nullptr;
    ColliderType m_type = ColliderType::Box;
    Vector3 m_center = Vector3::Zero();
    Vector3 m_size = Vector3::One();
    float m_radius = 0.5f;
    float m_height = 1.0f;
    bool m_isTrigger = false;
    int m_collisionLayer = 1;
    int m_mask = 1;

    friend class RigidBody;
};

// ============================================================
// Collision Contact
// ============================================================

struct Contact {
    Collider* colliderA = nullptr;
    Collider* colliderB = nullptr;
    Vector3 position;
    Vector3 normal;
    float penetration = 0.0f;
};

} // namespace kevla
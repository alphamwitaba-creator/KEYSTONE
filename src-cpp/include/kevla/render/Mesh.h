#pragma once

#include <vector>
#include <string>
#include <cstdint>
#include "../Vector.h"

namespace kevla {

// ============================================================
// Mesh - 3D Geometry
// ============================================================

struct Vertex {
    Vector3 position;
    Vector3 normal;
    Vector2 uv;
    Vector4 color;
};

class Mesh {
public:
    Mesh();
    ~Mesh() = default;

    void setVertices(const std::vector<Vertex>& vertices);
    void setIndices(const std::vector<uint32_t>& indices);

    const std::vector<Vertex>& getVertices() const { return m_vertices; }
    const std::vector<uint32_t>& getIndices() const { return m_indices; }

    size_t getVertexCount() const { return m_vertices.size(); }
    size_t getIndexCount() const { return m_indices.size(); }
    size_t getTriangleCount() const { return m_indices.size() / 3; }

    void calculateNormals();
    void calculateTangents();

    void clear();

    bool isValid() const { return !m_vertices.empty(); }

    static Mesh* createCube(float size = 1.0f);
    static Mesh* createSphere(float radius = 1.0f, int segments = 32);
    static Mesh* createPlane(float width = 1.0f, float height = 1.0f);
    static Mesh* createQuad(float width = 1.0f, float height = 1.0f);

private:
    std::vector<Vertex> m_vertices;
    std::vector<uint32_t> m_indices;
    std::string m_name;
};

// ============================================================
// Mesh Helper Functions
// ============================================================

inline Mesh* createCube(float size) { return Mesh::createCube(size); }
inline Mesh* createSphere(float radius, int segments) { return Mesh::createSphere(radius, segments); }
inline Mesh* createPlane(float width, float height) { return Mesh::createPlane(width, height); }

} // namespace kevla
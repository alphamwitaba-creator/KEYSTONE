#include "kevla/render/Mesh.h"
#include <cmath>
#include <algorithm>

namespace kevla {

Mesh::Mesh() {
}

void Mesh::setVertices(const std::vector<Vertex>& vertices) {
    m_vertices = vertices;
}

void Mesh::setIndices(const std::vector<uint32_t>& indices) {
    m_indices = indices;
}

void Mesh::clear() {
    m_vertices.clear();
    m_indices.clear();
}

void Mesh::calculateNormals() {
    for (auto& v : m_vertices) {
        v.normal = Vector3::Zero();
    }

    for (size_t i = 0; i < m_indices.size(); i += 3) {
        uint32_t i0 = m_indices[i];
        uint32_t i1 = m_indices[i + 1];
        uint32_t i2 = m_indices[i + 2];

        Vector3 v0 = m_vertices[i0].position;
        Vector3 v1 = m_vertices[i1].position;
        Vector3 v2 = m_vertices[i2].position;

        Vector3 edge1 = v1 - v0;
        Vector3 edge2 = v2 - v0;
        Vector3 normal = edge1.cross(edge2);

        m_vertices[i0].normal += normal;
        m_vertices[i1].normal += normal;
        m_vertices[i2].normal += normal;
    }

    for (auto& v : m_vertices) {
        v.normal = v.normal.normalized();
    }
}

void Mesh::calculateTangents() {
    for (size_t i = 0; i < m_indices.size(); i += 3) {
        uint32_t i0 = m_indices[i];
        uint32_t i1 = m_indices[i + 1];
        uint32_t i2 = m_indices[i + 2];

        Vertex& v0 = m_vertices[i0];
        Vertex& v1 = m_vertices[i1];
        Vertex& v2 = m_vertices[i2];

        Vector3 edge1 = v1.position - v0.position;
        Vector3 edge2 = v2.position - v0.position;

        Vector2 delta1 = v1.uv - v0.uv;
        Vector2 delta2 = v2.uv - v0.uv;

        float r = 1.0f / (delta1.x * delta2.y - delta2.x * delta1.y);
        Vector3 tangent = (edge1 * delta2.y - edge2 * delta1.y) * r;

        v0.normal = tangent;
        v1.normal = tangent;
        v2.normal = tangent;
    }
}

Mesh* Mesh::createCube(float size) {
    auto mesh = new Mesh();
    float h = size / 2.0f;

    std::vector<Vertex> vertices = {
        {{-h, -h,  h}, { 0,  0,  1}, {0, 0}},
        {{ h, -h,  h}, { 0,  0,  1}, {1, 0}},
        {{ h,  h,  h}, { 0,  0,  1}, {1, 1}},
        {{-h,  h,  h}, { 0,  0,  1}, {0, 1}},
        {{-h,  h, -h}, { 0,  0, -1}, {0, 1}},
        {{ h,  h, -h}, { 0,  0, -1}, {1, 1}},
        {{ h, -h, -h}, { 0,  0, -1}, {1, 0}},
        {{-h, -h, -h}, { 0,  0, -1}, {0, 0}},
        {{-h,  h,  h}, { 0,  1,  0}, {0, 0}},
        {{ h,  h,  h}, { 0,  1,  0}, {1, 0}},
        {{ h,  h, -h}, { 0,  1,  0}, {1, 1}},
        {{-h,  h, -h}, { 0,  1,  0}, {0, 1}},
        {{-h, -h, -h}, { 0, -1,  0}, {0, 0}},
        {{ h, -h, -h}, { 0, -1,  0}, {1, 0}},
        {{ h, -h,  h}, { 0, -1,  0}, {1, 1}},
        {{-h, -h,  h}, { 0, -1,  0}, {0, 1}},
        {{ h, -h,  h}, { 1,  0,  0}, {0, 0}},
        {{ h,  h,  h}, { 1,  0,  0}, {1, 0}},
        {{ h,  h, -h}, { 1,  0,  0}, {1, 1}},
        {{ h, -h, -h}, { 1,  0,  0}, {0, 1}},
        {{-h, -h, -h}, {-1,  0,  0}, {0, 0}},
        {{-h,  h, -h}, {-1,  0,  0}, {1, 0}},
        {{-h,  h,  h}, {-1,  0,  0}, {1, 1}},
        {{-h, -h,  h}, {-1,  0,  0}, {0, 1}},
    };

    std::vector<uint32_t> indices = {
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        8, 9, 10, 8, 10, 11,
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19,
        20, 21, 22, 20, 22, 23
    };

    mesh->setVertices(vertices);
    mesh->setIndices(indices);
    mesh->calculateNormals();

    return mesh;
}

Mesh* Mesh::createSphere(float radius, int segments) {
    auto mesh = new Mesh();

    std::vector<Vertex> vertices;
    std::vector<uint32_t> indices;

    for (int lat = 0; lat <= segments; lat++) {
        float theta = lat * math::PI / segments;
        float sinTheta = std::sin(theta);
        float cosTheta = std::cos(theta);

        for (int lon = 0; lon <= segments; lon++) {
            float phi = lon * 2.0f * math::PI / segments;
            float sinPhi = std::sin(phi);
            float cosPhi = std::cos(phi);

            float x = cosPhi * sinTheta;
            float y = cosTheta;
            float z = sinPhi * sinTheta;

            Vertex v;
            v.position = { x * radius, y * radius, z * radius };
            v.normal = { x, y, z };
            v.uv = { (float)lon / segments, (float)lat / segments };
            vertices.push_back(v);
        }
    }

    for (int lat = 0; lat < segments; lat++) {
        for (int lon = 0; lon < segments; lon++) {
            uint32_t first = lat * (segments + 1) + lon;
            uint32_t second = first + segments + 1;

            indices.push_back(first);
            indices.push_back(second);
            indices.push_back(first + 1);

            indices.push_back(second);
            indices.push_back(second + 1);
            indices.push_back(first + 1);
        }
    }

    mesh->setVertices(vertices);
    mesh->setIndices(indices);

    return mesh;
}

Mesh* Mesh::createPlane(float width, float height) {
    auto mesh = new Mesh();
    float hw = width / 2.0f;
    float hh = height / 2.0f;

    std::vector<Vertex> vertices = {
        {{-hw, 0, -hh}, {0, 1, 0}, {0, 0}},
        {{ hw, 0, -hh}, {0, 1, 0}, {1, 0}},
        {{ hw, 0,  hh}, {0, 1, 0}, {1, 1}},
        {{-hw, 0,  hh}, {0, 1, 0}, {0, 1}},
    };

    std::vector<uint32_t> indices = { 0, 1, 2, 0, 2, 3 };

    mesh->setVertices(vertices);
    mesh->setIndices(indices);

    return mesh;
}

Mesh* Mesh::createQuad(float width, float height) {
    return createPlane(width, height);
}

} // namespace kevla
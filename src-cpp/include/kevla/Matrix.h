#pragma once

#include "Vector.h"

namespace kevla {

// ============================================================
// Matrix4x4
// ============================================================

struct Matrix4 {
    float m[4][4] = {};
    
    Matrix4() {
        identity();
    }
    
    static Matrix4 Identity() {
        Matrix4 mat;
        mat.identity();
        return mat;
    }
    
    void identity() {
        m[0][0] = 1; m[0][1] = 0; m[0][2] = 0; m[0][3] = 0;
        m[1][0] = 0; m[1][1] = 1; m[1][2] = 0; m[1][3] = 0;
        m[2][0] = 0; m[2][1] = 0; m[2][2] = 1; m[2][3] = 0;
        m[3][0] = 0; m[3][1] = 0; m[3][2] = 0; m[3][3] = 1;
    }
    
    static Matrix4 Translation(const Vector3& t) {
        Matrix4 mat;
        mat.m[0][3] = t.x;
        mat.m[1][3] = t.y;
        mat.m[2][3] = t.z;
        return mat;
    }
    
    static Matrix4 Rotation(float angle, const Vector3& axis) {
        Matrix4 mat;
        float c = std::cos(angle);
        float s = std::sin(angle);
        float t = 1.0f - c;
        
        Vector3 a = axis.normalized();
        
        mat.m[0][0] = t * a.x * a.x + c;
        mat.m[0][1] = t * a.x * a.y + s * a.z;
        mat.m[0][2] = t * a.x * a.z - s * a.y;
        
        mat.m[1][0] = t * a.x * a.y - s * a.z;
        mat.m[1][1] = t * a.y * a.y + c;
        mat.m[1][2] = t * a.y * a.z + s * a.x;
        
        mat.m[2][0] = t * a.x * a.z + s * a.y;
        mat.m[2][1] = t * a.y * a.z - s * a.x;
        mat.m[2][2] = t * a.z * a.z + c;
        
        return mat;
    }
    
    static Matrix4 Scale(const Vector3& s) {
        Matrix4 mat;
        mat.m[0][0] = s.x;
        mat.m[1][1] = s.y;
        mat.m[2][2] = s.z;
        return mat;
    }
    
    static Matrix4 Perspective(float fov, float aspect, float near, float far) {
        Matrix4 mat;
        float tanHalfFov = std::tan(fov / 2.0f);
        
        mat.m[0][0] = 1.0f / (aspect * tanHalfFov);
        mat.m[1][1] = 1.0f / tanHalfFov;
        mat.m[2][2] = -(far + near) / (far - near);
        mat.m[2][3] = -1.0f;
        mat.m[3][2] = -(2.0f * far * near) / (far - near);
        
        return mat;
    }
    
    static Matrix4 Orthographic(float left, float right, float bottom, float top, float near, float far) {
        Matrix4 mat;
        
        mat.m[0][0] = 2.0f / (right - left);
        mat.m[1][1] = 2.0f / (top - bottom);
        mat.m[2][2] = -2.0f / (far - near);
        
        mat.m[0][3] = -(right + left) / (right - left);
        mat.m[1][3] = -(top + bottom) / (top - bottom);
        mat.m[2][3] = -(far + near) / (far - near);
        
        return mat;
    }
    
    static Matrix4 LookAt(const Vector3& eye, const Vector3& target, const Vector3& up) {
        Matrix4 mat;
        
        Vector3 forward = (target - eye).normalized();
        Vector3 right = forward.cross(up).normalized();
        Vector3 newUp = right.cross(forward);
        
        mat.m[0][0] = right.x;
        mat.m[1][0] = right.y;
        mat.m[2][0] = right.z;
        
        mat.m[0][1] = newUp.x;
        mat.m[1][1] = newUp.y;
        mat.m[2][1] = newUp.z;
        
        mat.m[0][2] = -forward.x;
        mat.m[1][2] = -forward.y;
        mat.m[2][2] = -forward.z;
        
        mat.m[0][3] = -right.dot(eye);
        mat.m[1][3] = -newUp.dot(eye);
        mat.m[2][3] = forward.dot(eye);
        
        return mat;
    }
    
    Matrix4 operator*(const Matrix4& b) const {
        Matrix4 result;
        for (int i = 0; i < 4; i++) {
            for (int j = 0; j < 4; j++) {
                result.m[i][j] = 0;
                for (int k = 0; k < 4; k++) {
                    result.m[i][j] += m[i][k] * b.m[k][j];
                }
            }
        }
        return result;
    }
    
    Vector3 transformPoint(const Vector3& p) const {
        return {
            m[0][0] * p.x + m[0][1] * p.y + m[0][2] * p.z + m[0][3],
            m[1][0] * p.x + m[1][1] * p.y + m[1][2] * p.z + m[1][3],
            m[2][0] * p.x + m[2][1] * p.y + m[2][2] * p.z + m[2][3]
        };
    }
    
    Vector3 transformDirection(const Vector3& d) const {
        return {
            m[0][0] * d.x + m[0][1] * d.y + m[0][2] * d.z,
            m[1][0] * d.x + m[1][1] * d.y + m[1][2] * d.z,
            m[2][0] * d.x + m[2][1] * d.y + m[2][2] * d.z
        };
    }
    
    float* data() { return &m[0][0]; }
    const float* data() const { return &m[0][0]; }
};

// ============================================================
// Transform Component
// ============================================================

struct Transform {
    Vector3 position = Vector3::Zero();
    Vector3 rotation = Vector3::Zero();  // Euler angles in degrees
    Vector3 scale = Vector3::One();
    
    Matrix4 getMatrix() const {
        Matrix4 translation = Matrix4::Translation(position);
        Matrix4 rotX = Matrix4::Rotation(math::toRadians(rotation.x), Vector3::Right());
        Matrix4 rotY = Matrix4::Rotation(math::toRadians(rotation.y), Vector3::Up());
        Matrix4 rotZ = Matrix4::Rotation(math::toRadians(rotation.z), Vector3::Forward());
        Matrix4 scaleMat = Matrix4::Scale(scale);
        
        return translation * rotY * rotX * rotZ * scaleMat;
    }
    
    Matrix4 getInverseMatrix() const {
        Matrix4 m = getMatrix();
        // Simplified inverse (works for orthogonal transforms)
        return m; // TODO: implement proper inverse
    }
    
    Vector3 forward() const {
        Matrix4 m = getMatrix();
        return m.transformDirection(Vector3::Forward());
    }
    
    Vector3 up() const {
        Matrix4 m = getMatrix();
        return m.transformDirection(Vector3::Up());
    }
    
    Vector3 right() const {
        Matrix4 m = getMatrix();
        return m.transformDirection(Vector3::Right());
    }
};

} // namespace kevla
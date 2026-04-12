#pragma once

#include <cmath>
#include <ostream>

namespace kevla {

// ============================================================
// Vector2
// ============================================================

struct Vector2 {
    float x = 0.0f, y = 0.0f;
    
    Vector2() = default;
    Vector2(float x, float y) : x(x), y(y) {}
    
    float length() const { return std::sqrt(x * x + y * y); }
    float lengthSquared() const { return x * x + y * y; }
    
    Vector2 normalized() const {
        float len = length();
        if (len > 0.0001f) return { x / len, y / len };
        return { 0, 0 };
    }
    
    float dot(const Vector2& v) const { return x * v.x + y * v.y; }
    
    Vector2 operator+(const Vector2& v) const { return { x + v.x, y + v.y }; }
    Vector2 operator-(const Vector2& v) const { return { x - v.x, y - v.y }; }
    Vector2 operator*(float s) const { return { x * s, y * s }; }
    Vector2 operator/(float s) const { return { x / s, y / s }; }
    
    Vector2& operator+=(const Vector2& v) { x += v.x; y += v.y; return *this; }
    Vector2& operator-=(const Vector2& v) { x -= v.x; y -= v.y; return *this; }
    Vector2& operator*=(float s) { x *= s; y *= s; return *this; }
};

// ============================================================
// Vector3
// ============================================================

struct Vector3 {
    float x = 0.0f, y = 0.0f, z = 0.0f;
    
    Vector3() = default;
    Vector3(float x, float y, float z) : x(x), y(y), z(z) {}
    
    static Vector3 Zero() { return { 0, 0, 0 }; }
    static Vector3 One() { return { 1, 1, 1 }; }
    static Vector3 Up() { return { 0, 1, 0 }; }
    static Vector3 Forward() { return { 0, 0, -1 }; }
    static Vector3 Right() { return { 1, 0, 0 }; }
    
    float length() const { return std::sqrt(x * x + y * y + z * z); }
    float lengthSquared() const { return x * x + y * y + z * z; }
    
    Vector3 normalized() const {
        float len = length();
        if (len > 0.0001f) return { x / len, y / len, z / len };
        return { 0, 0, 0 };
    }
    
    float dot(const Vector3& v) const { return x * v.x + y * v.y + z * v.z; }
    
    Vector3 cross(const Vector3& v) const {
        return {
            y * v.z - z * v.y,
            z * v.x - x * v.z,
            x * v.y - y * v.x
        };
    }
    
    Vector3 operator+(const Vector3& v) const { return { x + v.x, y + v.y, z + v.z }; }
    Vector3 operator-(const Vector3& v) const { return { x - v.x, y - v.y, z - v.z }; }
    Vector3 operator*(float s) const { return { x * s, y * s, z * s }; }
    Vector3 operator/(float s) const { return { x / s, y / s, z / s }; }
    
    Vector3& operator+=(const Vector3& v) { x += v.x; y += v.y; z += v.z; return *this; }
    Vector3& operator-=(const Vector3& v) { x -= v.x; y -= v.y; z -= v.z; return *this; }
    Vector3& operator*=(float s) { x *= s; y *= s; z *= s; return *this; }
    
    bool operator==(const Vector3& v) const {
        return std::abs(x - v.x) < 0.0001f && std::abs(y - v.y) < 0.0001f && std::abs(z - v.z) < 0.0001f;
    }
};

// ============================================================
// Vector4
// ============================================================

struct Vector4 {
    float x = 0.0f, y = 0.0f, z = 0.0f, w = 1.0f;
    
    Vector4() = default;
    Vector4(float x, float y, float z, float w) : x(x), y(y), z(z), w(w) {}
    Vector4(const Vector3& v, float w) : x(v.x), y(v.y), z(v.z), w(w) {}
    
    Vector3 toVector3() const { return { x, y, z }; }
};

// ============================================================
// Color
// ============================================================

struct Color {
    float r = 1.0f, g = 1.0f, b = 1.0f, a = 1.0f;
    
    Color() = default;
    Color(float r, float g, float b, float a = 1.0f) : r(r), g(g), b(b), a(a) {}
    
    static Color White() { return { 1, 1, 1, 1 }; }
    static Color Black() { return { 0, 0, 0, 1 }; }
    static Color Red() { return { 1, 0, 0, 1 }; }
    static Color Green() { return { 0, 1, 0, 1 }; }
    static Color Blue() { return { 0, 0, 1, 1 }; }
    static Color Yellow() { return { 1, 1, 0, 1 }; }
    
    float* data() { return &r; }
    const float* data() const { return &r; }
};

// ============================================================
// Math Utilities
// ============================================================

namespace math {
    constexpr float PI = 3.14159265358979323846f;
    constexpr float TWO_PI = 2.0f * PI;
    constexpr float HALF_PI = PI / 2.0f;
    
    inline float toRadians(float degrees) { return degrees * (PI / 180.0f); }
    inline float toDegrees(float radians) { return radians * (180.0f / PI); }
    
    inline float clamp(float value, float min, float max) {
        return value < min ? min : value > max ? max : value;
    }
    
    inline float lerp(float a, float b, float t) {
        return a + (b - a) * clamp(t, 0.0f, 1.0f);
    }
    
    inline float smoothstep(float a, float b, float t) {
        t = clamp((t - a) / (b - a), 0.0f, 1.0f);
        return t * t * (3.0f - 2.0f * t);
    }
}

} // namespace kevla
#pragma once

namespace kevla {

// ============================================================
// Light Types
// ============================================================

enum class LightType {
    Directional,
    Point,
    Spot,
    Ambient
};

// ============================================================
// Light Component
// ============================================================

class Light {
public:
    Light();
    ~Light() = default;

    void setType(LightType type) { m_type = type; }
    LightType getType() const { return m_type; }

    void setColor(const Color& color) { m_color = color; }
    const Color& getColor() const { return m_color; }

    void setIntensity(float intensity) { m_intensity = intensity; }
    float getIntensity() const { return m_intensity; }

    void setRange(float range) { m_range = range; }
    float getRange() const { return m_range; }

    void setSpotAngle(float angle) { m_spotAngle = angle; }
    float getSpotAngle() const { return m_spotAngle; }

    void setCastShadows(bool cast) { m_castShadows = cast; }
    bool getCastShadows() const { return m_castShadows; }

    static Light* createDirectional(const Vector3& direction);
    static Light* createPoint(const Vector3& position, float range = 10.0f);
    static Light* createSpot(const Vector3& position, const Vector3& direction);

private:
    LightType m_type = LightType::Directional;
    Color m_color = Color::White();
    float m_intensity = 1.0f;
    float m_range = 10.0f;
    float m_spotAngle = 45.0f;
    bool m_castShadows = false;
};

// ============================================================
// Light Helper Functions
// ============================================================

inline Light* createDirectionalLight(const Vector3& direction = Vector3(0, -1, 0)) {
    return Light::createDirectional(direction);
}

inline Light* createPointLight(const Vector3& position, float range = 10.0f) {
    return Light::createPoint(position, range);
}

inline Light* createSpotLight(const Vector3& position, const Vector3& direction) {
    return Light::createSpot(position, direction);
}

} // namespace kevla
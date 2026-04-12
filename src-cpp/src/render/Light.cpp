#include "kevla/render/Light.h"

namespace kevla {

Light::Light()
    : m_type(LightType::Directional)
    , m_color(Color::White())
    , m_intensity(1.0f)
    , m_range(10.0f)
    , m_spotAngle(45.0f)
    , m_castShadows(false)
{
}

Light* Light::createDirectional(const Vector3& direction) {
    auto light = new Light();
    (void)direction;
    return light;
}

Light* Light::createPoint(const Vector3& position, float range) {
    auto light = new Light();
    light->m_type = LightType::Point;
    light->m_range = range;
    (void)position;
    return light;
}

Light* Light::createSpot(const Vector3& position, const Vector3& direction) {
    auto light = new Light();
    light->m_type = LightType::Spot;
    (void)position;
    (void)direction;
    return light;
}

} // namespace kevla
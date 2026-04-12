#include "kevla/render/Material.h"

namespace kevla {

Material::Material()
    : m_name("Material")
    , m_albedo(Color::White())
    , m_metallic(0.0f)
    , m_roughness(0.5f)
    , m_ambientOcclusion(1.0f)
    , m_emissive(Color::Black())
    , m_alpha(1.0f)
    , m_transparent(false)
    , m_cullFace(true)
    , m_wireframe(false)
{
}

Material* Material::create(const std::string& name) {
    auto mat = new Material();
    mat->setName(name);
    return mat;
}

} // namespace kevla
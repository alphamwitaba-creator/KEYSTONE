#pragma once

#include <string>
#include <memory>

namespace kevla {

// ============================================================
// Material - Rendering Properties
// ============================================================

class Material {
public:
    Material();
    ~Material() = default;

    void setName(const std::string& name) { m_name = name; }
    const std::string& getName() const { return m_name; }

    void setAlbedo(const Color& color) { m_albedo = color; }
    const Color& getAlbedo() const { return m_albedo; }

    void setMetallic(float metallic) { m_metallic = metallic; }
    float getMetallic() const { return m_metallic; }

    void setRoughness(float roughness) { m_roughness = roughness; }
    float getRoughness() const { return m_roughness; }

    void setAmbientOcclusion(float ao) { m_ambientOcclusion = ao; }
    float getAmbientOcclusion() const { return m_ambientOcclusion; }

    void setEmissive(const Color& emissive) { m_emissive = emissive; }
    const Color& getEmissive() const { return m_emissive; }

    void setAlpha(float alpha) { m_alpha = alpha; }
    float getAlpha() const { return m_alpha; }

    void setTransparent(bool transparent) { m_transparent = transparent; }
    bool isTransparent() const { return m_transparent; }

    void setCullFace(bool cull) { m_cullFace = cull; }
    bool getCullFace() const { return m_cullFace; }

    void setWireframe(bool wireframe) { m_wireframe = wireframe; }
    bool isWireframe() const { return m_wireframe; }

    static Material* create(const std::string& name = "Material");

private:
    std::string m_name;
    Color m_albedo = Color::White();
    float m_metallic = 0.0f;
    float m_roughness = 0.5f;
    float m_ambientOcclusion = 1.0f;
    Color m_emissive = Color::Black();
    float m_alpha = 1.0f;
    bool m_transparent = false;
    bool m_cullFace = true;
    bool m_wireframe = false;
};

// ============================================================
// Material Helper
// ============================================================

inline Material* createMaterial(const std::string& name) {
    return Material::create(name);
}

} // namespace kevla
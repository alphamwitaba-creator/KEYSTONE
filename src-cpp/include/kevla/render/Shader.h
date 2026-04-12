#pragma once

#include <string>
#include <unordered_map>

namespace kevla {

// ============================================================
// Shader - GPU Program
// ============================================================

class Shader {
public:
    Shader();
    ~Shader() = default;

    bool loadFromFiles(const std::string& vertexPath, const std::string& fragmentPath);
    bool loadFromSource(const std::string& vertexSource, const std::string& fragmentSource);

    void bind() const;
    void unbind() const;

    bool isValid() const { return m_valid; }
    int getProgram() const { return m_program; }

    void setUniform(const std::string& name, int value);
    void setUniform(const std::string& name, float value);
    void setUniform(const std::string& name, const Vector2& value);
    void setUniform(const std::string& name, const Vector3& value);
    void setUniform(const std::string& name, const Vector4& value);
    void setUniform(const std::string& name, const Matrix4& value);

    static Shader* create(const std::string& vertexPath, const std::string& fragmentPath);
    static Shader* createBasic();
    static Shader* createLit();
    static Shader* createUnlit();
    static Shader* createWireframe();

private:
    bool compile(const std::string& source, int type);
    int getUniformLocation(const std::string& name);

    int m_program = 0;
    int m_vertexShader = 0;
    int m_fragmentShader = 0;
    bool m_valid = false;
    std::unordered_map<std::string, int> m_uniforms;
};

// ============================================================
// Built-in Shaders
// ============================================================

namespace Shaders {
    inline const char* BasicVertex = R"(
        #version 330 core
        layout(location = 0) in vec3 aPosition;
        layout(location = 1) in vec3 aNormal;
        uniform mat4 uModel;
        uniform mat4 uView;
        uniform mat4 uProjection;
        out vec3 vNormal;
        out vec3 vPosition;
        void main() {
            vPosition = (uModel * vec4(aPosition, 1.0)).xyz;
            vNormal = mat3(transpose(inverse(uModel))) * aNormal;
            gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
        }
    )";

    inline const char* LitFragment = R"(
        #version 330 core
        in vec3 vNormal;
        in vec3 vPosition;
        uniform vec3 uCameraPosition;
        uniform vec3 uLightPosition;
        uniform vec3 uAlbedo;
        uniform float uMetallic;
        uniform float uRoughness;
        out vec4 fragColor;
        void main() {
            vec3 N = normalize(vNormal);
            vec3 L = normalize(uLightPosition - vPosition);
            vec3 V = normalize(uCameraPosition - vPosition);
            vec3 H = normalize(L + V);
            
            float diff = max(dot(N, L), 0.0);
            vec3 diffuse = uAlbedo * diff;
            
            float spec = pow(max(dot(N, H), 0.0), 32.0 * (1.0 - uRoughness));
            vec3 specular = vec3(spec);
            
            vec3 ambient = uAlbedo * 0.1;
            fragColor = vec4(ambient + diffuse * 0.8 + specular * 0.5, 1.0);
        }
    )";

    inline const char* UnlitFragment = R"(
        #version 330 core
        uniform vec4 uColor;
        out vec4 fragColor;
        void main() {
            fragColor = uColor;
        }
    )";
}

} // namespace kevla
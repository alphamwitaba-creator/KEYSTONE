#include "kevla/render/Shader.h"
#include "kevla/Logger.h"
#include <fstream>
#include <sstream>

#ifdef KEVLA_PLATFORM_WINDOWS
    #include <GL/gl.h>
#else
    #include <OpenGL/gl.h>
#endif

namespace kevla {

Shader::Shader()
    : m_program(0)
    , m_vertexShader(0)
    , m_fragmentShader(0)
    , m_valid(false)
{
}

bool Shader::loadFromFiles(const std::string& vertexPath, const std::string& fragmentPath) {
    std::ifstream vFile(vertexPath);
    std::ifstream fFile(fragmentPath);

    if (!vFile.is_open() || !fFile.is_open()) {
        KEVLA_ERROR("Failed to open shader files");
        return false;
    }

    std::stringstream vss, fss;
    vss << vFile.rdbuf();
    fss << fFile.rdbuf();

    return loadFromSource(vss.str(), fss.str());
}

bool Shader::loadFromSource(const std::string& vertexSource, const std::string& fragmentSource) {
    if (!compile(vertexSource, GL_VERTEX_SHADER)) {
        return false;
    }
    if (!compile(fragmentSource, GL_FRAGMENT_SHADER)) {
        return false;
    }

    m_program = glCreateProgram();
    glAttachShader(m_program, m_vertexShader);
    glAttachShader(m_program, m_fragmentShader);
    glLinkProgram(m_program);

    int linked = 0;
    glGetProgramiv(m_program, GL_LINK_STATUS, &linked);

    if (!linked) {
        char log[512];
        glGetProgramInfoLog(m_program, sizeof(log), nullptr, log);
        KEVLA_ERROR(std::string("Shader link error: ") + log);
        return false;
    }

    glDeleteShader(m_vertexShader);
    glDeleteShader(m_fragmentShader);
    m_valid = true;

    return true;
}

void Shader::bind() const {
    if (m_valid) {
        glUseProgram(m_program);
    }
}

void Shader::unbind() const {
    glUseProgram(0);
}

bool Shader::compile(const std::string& source, int type) {
    const char* src = source.c_str();

    if (type == GL_VERTEX_SHADER) {
        m_vertexShader = glCreateShader(GL_VERTEX_SHADER);
        glShaderSource(m_vertexShader, 1, &src, nullptr);
        glCompileShader(m_vertexShader);
    } else {
        m_fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
        glShaderSource(m_fragmentShader, 1, &src, nullptr);
        glCompileShader(m_fragmentShader);
    }

    int compiled = 0;
    glGetShaderiv(type == GL_VERTEX_SHADER ? m_vertexShader : m_fragmentShader, GL_COMPILE_STATUS, &compiled);

    if (!compiled) {
        char log[512];
        glGetShaderInfoLog(type == GL_VERTEX_SHADER ? m_vertexShader : m_fragmentShader, sizeof(log), nullptr, log);
        KEVLA_ERROR(std::string("Shader compile error: ") + log);
        return false;
    }

    return true;
}

int Shader::getUniformLocation(const std::string& name) {
    auto it = m_uniforms.find(name);
    if (it != m_uniforms.end()) {
        return it->second;
    }

    int loc = glGetUniformLocation(m_program, name.c_str());
    m_uniforms[name] = loc;
    return loc;
}

void Shader::setUniform(const std::string& name, int value) {
    glUniform1i(getUniformLocation(name), value);
}

void Shader::setUniform(const std::string& name, float value) {
    glUniform1f(getUniformLocation(name), value);
}

void Shader::setUniform(const std::string& name, const Vector2& value) {
    glUniform2f(getUniformLocation(name), value.x, value.y);
}

void Shader::setUniform(const std::string& name, const Vector3& value) {
    glUniform3f(getUniformLocation(name), value.x, value.y, value.z);
}

void Shader::setUniform(const std::string& name, const Vector4& value) {
    glUniform4f(getUniformLocation(name), value.x, value.y, value.z, value.w);
}

void Shader::setUniform(const std::string& name, const Matrix4& value) {
    glUniformMatrix4fv(getUniformLocation(name), 1, GL_FALSE, value.data());
}

Shader* Shader::create(const std::string& vertexPath, const std::string& fragmentPath) {
    auto shader = new Shader();
    if (shader->loadFromFiles(vertexPath, fragmentPath)) {
        return shader;
    }
    delete shader;
    return nullptr;
}

Shader* Shader::createBasic() {
    auto shader = new Shader();
    if (shader->loadFromSource(Shaders::BasicVertex, Shaders::UnlitFragment)) {
        return shader;
    }
    delete shader;
    return nullptr;
}

Shader* Shader::createLit() {
    auto shader = new Shader();
    if (shader->loadFromSource(Shaders::BasicVertex, Shaders::LitFragment)) {
        return shader;
    }
    delete shader;
    return nullptr;
}

Shader* Shader::createUnlit() {
    return createBasic();
}

Shader* Shader::createWireframe() {
    return createBasic();
}

} // namespace kevla
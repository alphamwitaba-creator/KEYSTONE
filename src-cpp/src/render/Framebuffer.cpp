#include "kevla/render/Framebuffer.h"
#include "kevla/Logger.h"

#ifdef KEVLA_PLATFORM_WINDOWS
    #include <GL/gl.h>
#else
    #include <OpenGL/gl.h>
#endif

namespace kevla {

Framebuffer::Framebuffer()
    : m_framebuffer(0)
    , m_colorTexture(0)
    , m_depthTexture(0)
    , m_width(0)
    , m_height(0)
    , m_valid(false)
{
}

Framebuffer::~Framebuffer() {
    shutdown();
}

bool Framebuffer::initialize(int width, int height) {
    m_width = width;
    m_height = height;

    glGenFramebuffers(1, (GLuint*)&m_framebuffer);
    glBindFramebuffer(GL_FRAMEBUFFER, m_framebuffer);

    glGenTextures(1, (GLuint*)&m_colorTexture);
    glBindTexture(GL_TEXTURE_2D, m_colorTexture);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, nullptr);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, m_colorTexture, 0);

    glGenTextures(1, (GLuint*)&m_depthTexture);
    glBindTexture(GL_TEXTURE_2D, m_depthTexture);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_DEPTH24_STENCIL8, width, height, 0, GL_DEPTH_STENCIL, GL_UNSIGNED_INT_24_8, nullptr);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
    glFramebufferTexture2D(GL_FRAMEBUFFER, GL_DEPTH_STENCIL_ATTACHMENT, GL_TEXTURE_2D, m_depthTexture, 0);

    int status = glCheckFramebufferStatus(GL_FRAMEBUFFER);
    if (status != GL_FRAMEBUFFER_COMPLETE) {
        KEVLA_ERROR("Framebuffer incomplete");
        return false;
    }

    glBindFramebuffer(GL_FRAMEBUFFER, 0);
    m_valid = true;

    return true;
}

void Framebuffer::shutdown() {
    if (m_colorTexture) glDeleteTextures(1, (GLuint*)&m_colorTexture);
    if (m_depthTexture) glDeleteTextures(1, (GLuint*)&m_depthTexture);
    if (m_framebuffer) glDeleteFramebuffers(1, (GLuint*)&m_framebuffer);

    m_colorTexture = 0;
    m_depthTexture = 0;
    m_framebuffer = 0;
    m_valid = false;
}

void Framebuffer::bind() {
    glBindFramebuffer(GL_FRAMEBUFFER, m_framebuffer);
    glViewport(0, 0, m_width, m_height);
}

void Framebuffer::unbind() {
    glBindFramebuffer(GL_FRAMEBUFFER, 0);
}

Framebuffer* Framebuffer::create(int width, int height) {
    auto fb = new Framebuffer();
    if (fb->initialize(width, height)) {
        return fb;
    }
    delete fb;
    return nullptr;
}

} // namespace kevla
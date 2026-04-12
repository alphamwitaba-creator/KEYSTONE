#pragma once

#include <cstdint>

namespace kevla {

// ============================================================
// Framebuffer - Off-screen rendering target
// ============================================================

class Framebuffer {
public:
    Framebuffer();
    ~Framebuffer();

    bool initialize(int width, int height);
    void shutdown();

    void bind();
    void unbind();

    int getColorTexture() const { return m_colorTexture; }
    int getDepthTexture() const { return m_depthTexture; }

    int getWidth() const { return m_width; }
    int getHeight() const { return m_height; }

    bool isValid() const { return m_valid; }

    static Framebuffer* create(int width, int height);

private:
    int m_framebuffer = 0;
    int m_colorTexture = 0;
    int m_depthTexture = 0;
    int m_width = 0;
    int m_height = 0;
    bool m_valid = false;
};

} // namespace kevla
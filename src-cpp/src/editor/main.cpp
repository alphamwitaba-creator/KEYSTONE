#include <kevla/Core.h>
#include <kevla/editor/Editor.h>
#include <GLFW/glfw3.h>
#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>

#include <iostream>

#ifdef _WIN32
#include <windows.h>
#endif

using namespace kevla;

// ============================================================
// Load Window Icon (Windows only)
// ============================================================
void loadWindowIcon(GLFWwindow* window) {
#ifdef _WIN32
    HICON icon = static_cast<HICON>(LoadImageA(NULL, "assets/kevla-icon.ico", IMAGE_ICON, 0, 0, LR_LOADFROMFILE | LR_DEFAULTSIZE));
    if (icon) {
        SetClassLongPtrA(GetForegroundWindow(), GCLP_HICON, reinterpret_cast<LONG_PTR>(icon));
    }
#endif
}

// ============================================================
// Main Entry Point
// ============================================================

int main() {
    // Initialize GLFW
    if (!glfwInit()) {
        std::cerr << "Failed to initialize GLFW" << std::endl;
        return 1;
    }
    
    // Configure OpenGL context
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 6);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    glfwWindowHint(GLFW_OPENGL_DEBUG_CONTEXT, GL_TRUE);
    
    // Create window
    GLFWwindow* window = glfwCreateWindow(1280, 720, "KEVLA Engine Editor", nullptr, nullptr);
    if (!window) {
        std::cerr << "Failed to create GLFW window" << std::endl;
        glfwTerminate();
        return 1;
    }
    
    // Load custom icon
    loadWindowIcon(window);
    
    glfwMakeContextCurrent(window);
    glfwSwapInterval(1);
    
    // Initialize ImGui
    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;
    io.ConfigFlags |= ImGuiConfigFlags_DockingEnable;
    
    ImGui_ImplGlfw_InitForOpenGL(window, true);
    ImGui_ImplOpenGL3_Init("#version 460");
    
    // Initialize engine
    Engine engine;
    engine.initialize();
    
    // Create editor
    Editor editor;
    editor.initialize(window);
    
    // Main loop
    double lastTime = glfwGetTime();
    
    while (!glfwWindowShouldClose(window)) {
        double currentTime = glfwGetTime();
        float deltaTime = static_cast<float>(currentTime - lastTime);
        lastTime = currentTime;
        
        // Poll events
        glfwPollEvents();
        
        // Update engine
        engine.update(deltaTime);
        
        // Begin ImGui frame
        ImGui_ImplOpenGL3_NewFrame();
        ImGui_ImplGlfw_NewFrame();
        ImGui::NewFrame();
        
        // Render editor UI
        editor.render(deltaTime);
        
        // Render engine
        engine.render();
        
        // Render ImGui
        ImGui::Render();
        ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());
        
        // Present
        glfwSwapBuffers(window);
    }
    
    // Shutdown
    editor.shutdown();
    engine.shutdown();
    
    // Cleanup ImGui
    ImGui_ImplOpenGL3_Shutdown();
    ImGui_ImplGlfw_Shutdown();
    ImGui::DestroyContext();
    
    // Cleanup GLFW
    glfwDestroyWindow(window);
    glfwTerminate();
    
    return 0;
}
#pragma once

// ============================================================
// KEVLA ENGINE — Core Types & Definitions
// ============================================================

#include <string>
#include <vector>
#include <map>
#include <unordered_map>
#include <memory>
#include <functional>
#include <array>
#include <optional>

// Platform detection
#if defined(_WIN32) || defined(_WIN64)
    #define KEVLA_PLATFORM_WINDOWS
#elif defined(__APPLE__)
    #define KEVLA_PLATFORM_MACOS
#elif defined(__linux__)
    #define KEVLA_PLATFORM_LINUX
#endif

// Build configuration
#if defined(DEBUG) || defined(_DEBUG)
    #define KEVLA_DEBUG
#else
    #define KEVLA_RELEASE
#endif

// API export macros
#if defined(KEVLA_PLATFORM_WINDOWS)
    #ifdef KEVLA_EXPORTS
        #define KEVLA_API __declspec(dllexport)
    #else
        #define KEVLA_API __declspec(dllimport)
    #endif
#else
    #define KEVLA_API
#endif

// Forward declarations
namespace kevla {
    class Entity;
    class Scene;
    class Renderer;
    class PhysicsWorld;
}

// Version info
#define KEVLA_VERSION_MAJOR 2
#define KEVLA_VERSION_MINOR 0
#define KEVLA_VERSION_PATCH 0

namespace kevla {

// ============================================================
// Result & Optional Types
// ============================================================

template<typename T>
using Result = std::optional<T>;

template<typename T>
using Ref = std::shared_ptr<T>;

template<typename T>
using WeakRef = std::weak_ptr<T>;

template<typename T>
using Scope = std::unique_ptr<T>;

// Function result
struct ResultStatus {
    bool success;
    std::string message;
    
    ResultStatus() : success(false) {}
    ResultStatus(bool s, const std::string& msg = "") : success(s), message(msg) {}
    
    static ResultStatus OK() { return ResultStatus(true); }
    static ResultStatus Error(const std::string& msg) { return ResultStatus(false, msg); }
};

} // namespace kevla
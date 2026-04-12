#pragma once

#include <string>
#include <memory>
#include <spdlog/spdlog.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <spdlog/sinks/rotating_file_sink.h>

namespace kevla {

// ============================================================
// Log Levels
// ============================================================

enum class LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
    Critical
};

// ============================================================
// Logger
// ============================================================

class Logger {
public:
    static Logger& get() {
        static Logger instance;
        return instance;
    }
    
    void init();
    void shutdown();
    
    void setLevel(LogLevel level);
    void setPattern(const std::string& pattern);
    
    void trace(const std::string& msg);
    void debug(const std::string& msg);
    void info(const std::string& msg);
    void warn(const std::string& msg);
    void error(const std::string& msg);
    void critical(const std::string& msg);
    
    // Format logging
    template<typename... Args>
    void log(LogLevel level, fmt::format_string<Args...> fmt, Args&&... args) {
        auto msg = fmt::format(fmt, std::forward<Args>(args)...);
        switch (level) {
            case LogLevel::Trace: trace(msg); break;
            case LogLevel::Debug: debug(msg); break;
            case LogLevel::Info: info(msg); break;
            case LogLevel::Warn: warn(msg); break;
            case LogLevel::Error: error(msg); break;
            case LogLevel::Critical: critical(msg); break;
        }
    }
    
private:
    Logger() = default;
    ~Logger() = default;
    
    std::shared_ptr<spdlog::logger> m_logger;
    LogLevel m_level = LogLevel::Debug;
};

// Shortcut macros
#define KEVLA_TRACE(msg) ::kevla::Logger::get().trace(msg)
#define KEVLA_DEBUG(msg) ::kevla::Logger::get().debug(msg)
#define KEVLA_INFO(msg) ::kevla::Logger::get().info(msg)
#define KEVLA_WARN(msg) ::kevla::Logger::get().warn(msg)
#define KEVLA_ERROR(msg) ::kevla::Logger::get().error(msg)
#define KEVLA_CRITICAL(msg) ::kevla::Logger::get().critical(msg)

} // namespace kevla
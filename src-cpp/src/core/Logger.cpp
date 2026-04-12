#include "kevla/Logger.h"

namespace kevla {

void Logger::init() {
    try {
        auto consoleSink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
        auto fileSink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>("logs/kevla.log", 1024 * 1024 * 10, 3);

        std::vector<spdlog::sink_ptr> sinks { consoleSink, fileSink };
        m_logger = std::make_shared<spdlog::logger>("kevla", begin(sinks), end(sinks));

        spdlog::register_logger(m_logger);
        m_logger->set_level(spdlog::level::debug);
        m_logger->flush_on(spdlog::level::debug);

        setPattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [%n] %v");
    }
    catch (const spdlog::spdlog_ex& ex) {
        std::printf("Logger init failed: %s\n", ex.what());
    }
}

void Logger::shutdown() {
    if (m_logger) {
        m_logger->flush();
        spdlog::drop_all();
    }
}

void Logger::setLevel(LogLevel level) {
    m_level = level;
    if (m_logger) {
        switch (level) {
            case LogLevel::Trace: m_logger->set_level(spdlog::level::trace); break;
            case LogLevel::Debug: m_logger->set_level(spdlog::level::debug); break;
            case LogLevel::Info: m_logger->set_level(spdlog::level::info); break;
            case LogLevel::Warn: m_logger->set_level(spdlog::level::warn); break;
            case LogLevel::Error: m_logger->set_level(spdlog::level::err); break;
            case LogLevel::Critical: m_logger->set_level(spdlog::level::critical); break;
        }
    }
}

void Logger::setPattern(const std::string& pattern) {
    if (m_logger) {
        m_logger->set_pattern(pattern);
    }
}

void Logger::trace(const std::string& msg) {
    if (m_logger) m_logger->trace(msg);
}

void Logger::debug(const std::string& msg) {
    if (m_logger) m_logger->debug(msg);
}

void Logger::info(const std::string& msg) {
    if (m_logger) m_logger->info(msg);
}

void Logger::warn(const std::string& msg) {
    if (m_logger) m_logger->warn(msg);
}

void Logger::error(const std::string& msg) {
    if (m_logger) m_logger->error(msg);
}

void Logger::critical(const std::string& msg) {
    if (m_logger) m_logger->critical(msg);
}

} // namespace kevla
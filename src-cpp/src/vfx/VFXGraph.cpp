#include "kevla/vfx/VFXGraph.h"
#include <cmath>
#include <random>

namespace kevla {

// ============================================================
// VFXNode Implementation
// ============================================================

VFXNode::VFXNode(const std::string& id, VFXNodeType type)
    : m_id(id)
    , m_type(type)
{
}

void VFXNode::update(float deltaTime) {
    (void)deltaTime;
}

void VFXNode::setInputValue(const std::string& socket, float value) {
    m_floatInputs[socket] = value;
}

float VFXNode::getInputValue(const std::string& socket) const {
    auto it = m_floatInputs.find(socket);
    if (it != m_floatInputs.end()) {
        return it->second;
    }
    return 0.0f;
}

void VFXNode::setInputVec3(const std::string& socket, const Vector3& value) {
    m_vec3Inputs[socket] = value;
}

Vector3 VFXNode::getInputVec3(const std::string& socket) const {
    auto it = m_vec3Inputs.find(socket);
    if (it != m_vec3Inputs.end()) {
        return it->second;
    }
    return Vector3::Zero();
}

void VFXNode::setParameter(const std::string& name, const std::string& value) {
    m_parameters[name] = value;
}

std::string VFXNode::getParameter(const std::string& name) const {
    auto it = m_parameters.find(name);
    if (it != m_parameters.end()) {
        return it->second;
    }
    return "";
}

// ============================================================
// VFXParticleSystem Implementation
// ============================================================

VFXParticleSystem::VFXParticleSystem()
    : m_maxParticles(10000)
    , m_activeCount(0)
    , m_emitter(nullptr)
    , m_gravity(0, -9.81f, 0)
    , m_emitRate(10.0f)
    , m_emitTimer(0.0f)
{
}

VFXParticleSystem::~VFXParticleSystem() {
    shutdown();
}

void VFXParticleSystem::initialize(int maxParticles) {
    m_maxParticles = maxParticles;
    m_particles.resize(m_maxParticles);
}

void VFXParticleSystem::shutdown() {
    m_particles.clear();
    m_activeCount = 0;
}

void VFXParticleSystem::emit(int count) {
    static std::default_random_engine engine;
    static std::uniform_real_distribution<float> dist(0.0f, 1.0f);
    
    for (int i = 0; i < count && m_activeCount < m_maxParticles; i++) {
        Particle& p = m_particles[m_activeCount];
        p.position = Vector3::Zero();
        p.velocity = Vector3(
            (dist(engine) - 0.5f) * 2.0f,
            dist(engine) * 5.0f,
            (dist(engine) - 0.5f) * 2.0f
        );
        p.acceleration = m_gravity;
        p.age = 0.0f;
        p.lifetime = 1.0f + dist(engine);
        p.size = 0.1f;
        p.color = Color::White();
        p.rotation = 0.0f;
        p.spriteIndex = 0;
        p.alive = true;
        m_activeCount++;
    }
}

void VFXParticleSystem::update(float deltaTime) {
    for (int i = 0; i < m_activeCount; i++) {
        Particle& p = m_particles[i];
        
        if (!p.alive) continue;
        
        p.velocity += p.acceleration * deltaTime;
        p.position += p.velocity * deltaTime;
        p.age += deltaTime;
        
        if (p.age >= p.lifetime) {
            p.alive = false;
        }
    }
    
    m_emitTimer += deltaTime;
    if (m_emitTimer >= 1.0f / m_emitRate) {
        m_emitTimer = 0.0f;
        emit(1);
    }
}

void VFXParticleSystem::render(class Renderer* renderer) {
    (void)renderer;
}

int VFXParticleSystem::getParticleCount() const {
    return m_maxParticles;
}

int VFXParticleSystem::getActiveParticleCount() const {
    int count = 0;
    for (int i = 0; i < m_activeCount; i++) {
        if (m_particles[i].alive) {
            count++;
        }
    }
    return count;
}

// ============================================================
// VFXGraph Implementation
// ============================================================

VFXGraph::VFXGraph()
    : m_duration(5.0f)
    , m_startTime(0.0f)
    , m_looping(true)
{
}

VFXGraph::~VFXGraph() {
    clear();
}

void VFXGraph::clear() {
    for (auto* node : m_nodes) {
        delete node;
    }
    m_nodes.clear();
    m_connections.clear();
}

VFXNode* VFXGraph::addNode(VFXNodeType type, const std::string& id) {
    std::string nodeId = id.empty() ? generateNodeId() : id;
    auto* node = new VFXNode(nodeId, type);
    m_nodes.push_back(node);
    return node;
}

void VFXGraph::removeNode(const std::string& nodeId) {
    auto it = std::find_if(m_nodes.begin(), m_nodes.end(),
        [&nodeId](VFXNode* n) { return n->getId() == nodeId; });
    if (it != m_nodes.end()) {
        delete *it;
        m_nodes.erase(it);
    }
}

VFXNode* VFXGraph::getNode(const std::string& nodeId) const {
    for (auto* node : m_nodes) {
        if (node->getId() == nodeId) {
            return node;
        }
    }
    return nullptr;
}

void VFXGraph::addConnection(const VFXConnection& conn) {
    m_connections.push_back(conn);
}

void VFXGraph::removeConnection(const std::string& fromNode, const std::string& fromSocket) {
    auto it = std::find_if(m_connections.begin(), m_connections.end(),
        [&fromNode, &fromSocket](const VFXConnection& c) {
            return c.fromNode == fromNode && c.fromSocket == fromSocket;
        });
    if (it != m_connections.end()) {
        m_connections.erase(it);
    }
}

void VFXGraph::update(float deltaTime, VFXParticleSystem* particles) {
    for (auto* node : m_nodes) {
        node->update(deltaTime);
    }
    
    if (particles) {
        particles->update(deltaTime);
    }
}

std::string VFXGraph::serialize() const {
    return "";
}

void VFXGraph::deserialize(const std::string& data) {
    (void)data;
}

std::string VFXGraph::generateNodeId() {
    static int counter = 0;
    return "node_" + std::to_string(counter++);
}

// ============================================================
// VFXComponent Implementation
// ============================================================

VFXComponent::VFXComponent()
    : m_playing(false)
    , m_paused(false)
    , m_speed(1.0f)
    , m_autoDestroy(false)
    , m_elapsedTime(0.0f)
{
}

VFXComponent::~VFXComponent() {
}

void VFXComponent::setGraph(VFXGraph* graph) {
    m_graph.reset(graph);
}

void VFXComponent::play() {
    m_playing = true;
    m_paused = false;
}

void VFXComponent::stop() {
    m_playing = false;
}

void VFXComponent::pause() {
    m_paused = true;
}

void VFXComponent::reset() {
    m_elapsedTime = 0.0f;
    if (m_particles) {
        m_particles->initialize();
    }
}

void VFXComponent::update(float deltaTime) {
    if (!m_playing || m_paused) return;
    
    float scaledDelta = deltaTime * m_speed;
    m_elapsedTime += scaledDelta;
    
    if (m_graph) {
        m_graph->update(scaledDelta, m_particles.get());
        
        if (!m_graph->isLooping() && m_elapsedTime >= m_graph->getDuration()) {
            stop();
            if (m_autoDestroy) {
                m_playing = false;
            }
        }
    }
}

// ============================================================
// VFXLibrary Implementation
// ============================================================

VFXGraph* VFXLibrary::createExplosion() {
    auto graph = new VFXGraph();
    graph->setName("Explosion");
    graph->setDuration(1.0f);
    return graph;
}

VFXGraph* VFXLibrary::createFire() {
    auto graph = new VFXGraph();
    graph->setName("Fire");
    graph->setDuration(2.0f);
    return graph;
}

VFXGraph* VFXLibrary::createSmoke() {
    auto graph = new VFXGraph();
    graph->setName("Smoke");
    graph->setDuration(3.0f);
    return graph;
}

VFXGraph* VFXLibrary::createSparks() {
    auto graph = new VFXGraph();
    graph->setName("Sparks");
    graph->setDuration(1.0f);
    return graph;
}

VFXGraph* VFXLibrary::createConfetti() {
    auto graph = new VFXGraph();
    graph->setName("Confetti");
    graph->setDuration(3.0f);
    return graph;
}

VFXGraph* VFXLibrary::createDust() {
    auto graph = new VFXGraph();
    graph->setName("Dust");
    graph->setDuration(2.0f);
    return graph;
}

VFXGraph* VFXLibrary::createMagicTrail() {
    auto graph = new VFXGraph();
    graph->setName("MagicTrail");
    graph->setDuration(1.5f);
    return graph;
}

VFXGraph* VFXLibrary::createHealEffect() {
    auto graph = new VFXGraph();
    graph->setName("HealEffect");
    graph->setDuration(1.0f);
    return graph;
}

VFXGraph* VFXLibrary::createIceBurst() {
    auto graph = new VFXGraph();
    graph->setName("IceBurst");
    graph->setDuration(0.5f);
    return graph;
}

VFXGraph* VFXLibrary::createLightning() {
    auto graph = new VFXGraph();
    graph->setName("Lightning");
    graph->setDuration(0.2f);
    return graph;
}

} // namespace kevla
#pragma once

#include <vector>
#include <string>
#include <map>
#include <memory>
#include "kevla/Types.h"
#include "kevla/Vector.h"

namespace kevla {

// ============================================================
// VFX Graph System - Node-based visual effects
// ============================================================

/** VFX Node types */
enum class VFXNodeType {
    // Emitters
    PointEmitter,
    BoxEmitter,
    SphereEmitter,
    CircleEmitter,
    ConeEmitter,
    
    // Particles
    ParticleUpdate,
    Lifetime,
    SizeOverLife,
    ColorOverLife,
    VelocityOverLife,
    
    // Forces
    GravityForce,
    NoiseForce,
    WindForce,
    AttractorForce,
    
    // Shapes
    MeshEmitter,
    SpriteSheet,
    
    // Render
    Billboard,
    MeshRender,
    TrailRender,
    
    // Utilities
    Noise,
    Random,
    Curve,
    Lerp,
    Time
};

/** VFX Connection */
struct VFXConnection {
    std::string fromNode;
    std::string fromSocket;
    std::string toNode;
    std::string toSocket;
};

/** VFX Socket */
struct VFXSocket {
    std::string name;
    std::string type;  // float, vec3, color, texture
    bool isInput;
};

/** VFX Node */
class VFXNode {
public:
    VFXNode(const std::string& id, VFXNodeType type);
    virtual ~VFXNode() = default;
    
    virtual void update(float deltaTime);
    
    std::string getId() const { return m_id; }
    VFXNodeType getType() const { return m_type; }
    std::string getName() const { return m_name; }
    
    void setPosition(float x, float y) { m_x = x; m_y = y; }
    float getX() const { return m_x; }
    float getY() const { return m_y; }
    
    std::vector<VFXSocket>& getInputs() { return m_inputs; }
    std::vector<VFXSocket>& getOutputs() { return m_outputs; }
    
    void setInputValue(const std::string& socket, float value);
    float getInputValue(const std::string& socket) const;
    void setInputVec3(const std::string& socket, const Vector3& value);
    Vector3 getInputVec3(const std::string& socket) const;
    
    void setParameter(const std::string& name, const std::string& value);
    std::string getParameter(const std::string& name) const;
    
protected:
    std::string m_id;
    std::string m_name;
    VFXNodeType m_type;
    float m_x = 0, m_y = 0;
    
    std::vector<VFXSocket> m_inputs;
    std::vector<VFXSocket> m_outputs;
    
    std::map<std::string, float> m_floatInputs;
    std::map<std::string, Vector3> m_vec3Inputs;
    std::map<std::string, std::string> m_parameters;
};

// ============================================================
// Particle System
// ============================================================

struct Particle {
    Vector3 position;
    Vector3 velocity;
    Vector3 acceleration;
    float age = 0.0f;
    float lifetime = 1.0f;
    float size = 1.0f;
    Color color = Color::White();
    float rotation = 0.0f;
    int spriteIndex = 0;
    bool alive = true;
};

class VFXParticleSystem {
public:
    VFXParticleSystem();
    ~VFXParticleSystem();
    
    void initialize(int maxParticles = 10000);
    void shutdown();
    
    void emit(int count);
    void update(float deltaTime);
    void render(class Renderer* renderer);
    
    void setEmitter(VFXNode* emitter) { m_emitter = emitter; }
    void setGravity(const Vector3& gravity) { m_gravity = gravity; }
    void setMaxParticles(int max) { m_maxParticles = max; }
    
    int getParticleCount() const;
    int getActiveParticleCount() const;
    
private:
    std::vector<Particle> m_particles;
    int m_maxParticles = 10000;
    int m_activeCount = 0;
    
    VFXNode* m_emitter = nullptr;
    Vector3 m_gravity = { 0, -9.81f, 0 };
    
    float m_emitRate = 10.0f;
    float m_emitTimer = 0.0f;
};

// ============================================================
// VFX Graph
// ============================================================

class VFXGraph {
public:
    VFXGraph();
    ~VFXGraph();
    
    void clear();
    
    VFXNode* addNode(VFXNodeType type, const std::string& id = "");
    void removeNode(const std::string& nodeId);
    VFXNode* getNode(const std::string& nodeId) const;
    
    void addConnection(const VFXConnection& conn);
    void removeConnection(const std::string& fromNode, const std::string& fromSocket);
    
    const std::vector<VFXNode*>& getNodes() const { return m_nodes; }
    const std::vector<VFXConnection>& getConnections() const { return m_connections; }
    
    void setName(const std::string& name) { m_name = name; }
    const std::string& getName() const { return m_name; }
    
    void setDuration(float duration) { m_duration = duration; }
    float getDuration() const { return m_duration; }
    
    void setLooping(bool loop) { m_looping = loop; }
    bool isLooping() const { return m_looping; }
    
    void setStartTime(float time) { m_startTime = time; }
    float getStartTime() const { return m_startTime; }
    
    // Execute graph
    void update(float deltaTime, VFXParticleSystem* particles);
    
    // Serialization
    std::string serialize() const;
    void deserialize(const std::string& data);
    
private:
    std::string m_name = "New VFX";
    std::vector<VFXNode*> m_nodes;
    std::vector<VFXConnection> m_connections;
    
    float m_duration = 5.0f;
    float m_startTime = 0.0f;
    bool m_looping = true;
    
    std::string generateNodeId();
};

// ============================================================
// VFX Component (attached to entities)
// ============================================================

class VFXComponent {
public:
    VFXComponent();
    ~VFXComponent();
    
    void setGraph(VFXGraph* graph);
    VFXGraph* getGraph() const { return m_graph.get(); }
    
    void play();
    void stop();
    void pause();
    void reset();
    
    bool isPlaying() const { return m_playing; }
    bool isPaused() const { return m_paused; }
    
    void setSpeed(float speed) { m_speed = speed; }
    float getSpeed() const { return m_speed; }
    
    void setAutoDestroy(bool autoDestroy) { m_autoDestroy = autoDestroy; }
    bool getAutoDestroy() const { return m_autoDestroy; }
    
    void update(float deltaTime);
    
private:
    std::unique_ptr<VFXGraph> m_graph;
    std::unique_ptr<VFXParticleSystem> m_particles;
    
    bool m_playing = false;
    bool m_paused = false;
    float m_speed = 1.0f;
    bool m_autoDestroy = false;
    
    float m_elapsedTime = 0.0f;
};

// ============================================================
// VFX Library
// ============================================================

class VFXLibrary {
public:
    static VFXGraph* createExplosion();
    static VFXGraph* createFire();
    static VFXGraph* createSmoke();
    static VFXGraph* createSparks();
    static VFXGraph* createConfetti();
    static VFXGraph* createDust();
    static VFXGraph* createMagicTrail();
    static VFXGraph* createHealEffect();
    static VFXGraph* createIceBurst();
    static VFXGraph* createLightning();
};

} // namespace kevla
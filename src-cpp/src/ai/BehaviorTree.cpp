#include "kevla/ai/BehaviorTree.h"
#include <sstream>

namespace kevla {

// ============================================================
// BehaviorNode Implementation
// ============================================================

BehaviorNode::BehaviorNode(const std::string& name, NodeType type)
    : m_name(name)
    , m_type(type)
{
}

void BehaviorNode::addChild(BehaviorNode* child) {
    if (child) {
        m_children.push_back(child);
    }
}

void BehaviorNode::removeChild(BehaviorNode* child) {
    auto it = std::find(m_children.begin(), m_children.end(), child);
    if (it != m_children.end()) {
        m_children.erase(it);
    }
}

// ============================================================
// BehaviorTree Implementation
// ============================================================

BehaviorTree::BehaviorTree()
    : m_root(nullptr)
    , m_debugMode(false)
{
}

BehaviorTree::~BehaviorTree() {
}

void BehaviorTree::setRoot(BehaviorNode* root) {
    m_root = root;
}

Status BehaviorTree::tick() {
    if (!m_root) {
        return Status::Failure();
    }
    return m_root->update();
}

void BehaviorTree::reset() {
    if (m_root) {
        m_root->reset();
    }
}

void BehaviorTree::addDecorator(BehaviorNode* node, DecoratorType type) {
    (void)node;
    (void)type;
}

std::string BehaviorTree::getDebugString() const {
    if (!m_root) return "";
    
    std::ostringstream oss;
    oss << m_root->getName();
    
    if (m_debugMode) {
        oss << " [DEBUG]";
    }
    
    return oss.str();
}

// ============================================================
// AIAgent Implementation
// ============================================================

AIAgent::AIAgent()
    : m_entity(nullptr)
    , m_updateInterval(0.1f)
    , m_updateTimer(0.0f)
{
}

AIAgent::~AIAgent() {
}

void AIAgent::setBehaviorTree(BehaviorTree* tree) {
    m_behaviorTree.reset(tree);
}

void AIAgent::update(float deltaTime) {
    m_updateTimer += deltaTime;
    
    if (m_updateTimer >= m_updateInterval) {
        m_updateTimer = 0.0f;
        
        if (m_behaviorTree) {
            m_behaviorTree->tick();
        }
    }
}

void AIAgent::addState(const std::string& name) {
    m_currentState = name;
}

void AIAgent::setState(const std::string& state) {
    m_currentState = state;
}

void AIAgent::addTransition(const std::string& from, const std::string& to, UpdateFunc condition) {
    Transition trans;
    trans.from = from;
    trans.to = to;
    trans.condition = condition;
    m_transitions.push_back(trans);
}

void AIAgent::setFloat(const std::string& name, float value) {
    m_floats[name] = value;
}

void AIAgent::setInt(const std::string& name, int value) {
    m_ints[name] = value;
}

void AIAgent::setBool(const std::string& name, bool value) {
    m_bools[name] = value;
}

float AIAgent::getFloat(const std::string& name) const {
    auto it = m_floats.find(name);
    if (it != m_floats.end()) {
        return it->second;
    }
    return 0.0f;
}

int AIAgent::getInt(const std::string& name) const {
    auto it = m_ints.find(name);
    if (it != m_ints.end()) {
        return it->second;
    }
    return 0;
}

bool AIAgent::getBool(const std::string& name) const {
    auto it = m_bools.find(name);
    if (it != m_bools.end()) {
        return it->second;
    }
    return false;
}

// ============================================================
// BehaviorTreeFactory Implementation
// ============================================================

BehaviorTree* BehaviorTreeFactory::createPatrol(const std::vector<Vector3>& waypoints) {
    (void)waypoints;
    auto tree = new BehaviorTree();
    return tree;
}

BehaviorTree* BehaviorTreeFactory::createChase(float detectionRange) {
    (void)detectionRange;
    auto tree = new BehaviorTree();
    return tree;
}

BehaviorTree* BehaviorTreeFactory::createAttack(float attackRange) {
    (void)attackRange;
    auto tree = new BehaviorTree();
    return tree;
}

BehaviorTree* BehaviorTreeFactory::createFlee(float fleeDistance) {
    (void)fleeDistance;
    auto tree = new BehaviorTree();
    return tree;
}

BehaviorTree* BehaviorTreeFactory::createWander(float radius) {
    (void)radius;
    auto tree = new BehaviorTree();
    return tree;
}

BehaviorTree* BehaviorTreeFactory::createFollow(Entity* target, float followDistance) {
    (void)target;
    (void)followDistance;
    auto tree = new BehaviorTree();
    return tree;
}

} // namespace kevla
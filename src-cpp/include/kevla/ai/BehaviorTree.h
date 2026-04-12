#pragma once

#include <string>
#include <vector>
#include <map>
#include <functional>
#include <memory>
#include "kevla/Types.h"
#include "kevla/Entity.h"

namespace kevla {

// ============================================================
// AI Behavior Types
// ============================================================

enum class NodeType {
    Action,
    Condition,
    Composite,
    Decorator
};

enum class CompositeType {
    Sequence,
    Selector,
    Parallel,
    Random
};

enum class DecoratorType {
    Inverter,
    Repeater,
    UntilSuccess,
    UntilFailure,
    TimeLimit,
    Cooldown
};

// ============================================================
// Behavior Tree Node
// ============================================================

class BehaviorNode {
public:
    using UpdateFunc = std::function<class Status()>;
    
    BehaviorNode(const std::string& name, NodeType type);
    virtual ~BehaviorNode() = default;
    
    virtual class Status update() = 0;
    virtual void reset() {}
    
    const std::string& getName() const { return m_name; }
    NodeType getType() const { return m_type; }
    
    void setEnabled(bool enabled) { m_enabled = enabled; }
    bool isEnabled() const { return m_enabled; }
    
    void addChild(BehaviorNode* child);
    void removeChild(BehaviorNode* child);
    const std::vector<BehaviorNode*>& getChildren() const { return m_children; }
    
    virtual void* getUserData() const { return m_userData; }
    virtual void setUserData(void* data) { m_userData = data; }
    
protected:
    std::string m_name;
    NodeType m_type;
    std::vector<BehaviorNode*> m_children;
    bool m_enabled = true;
    void* m_userData = nullptr;
};

// ============================================================
// Behavior Status
// ============================================================

class Status {
public:
    enum State {
        None,
        Running,
        Success,
        Failure
    };
    
    Status() : m_state(None) {}
    Status(State state) : m_state(state) {}
    
    operator State() const { return m_state; }
    
    bool isRunning() const { return m_state == Running; }
    bool isSuccess() const { return m_state == Success; }
    bool isFailure() const { return m_state == Failure; }
    bool isDone() const { return m_state == Success || m_state == Failure; }
    
    static Status Running() { return Status(Running); }
    static Status Success() { return Status(Success); }
    static Status Failure() { return Status(Failure); }
    
private:
    State m_state;
};

// ============================================================
// Action Node
// ============================================================

class ActionNode : public BehaviorNode {
public:
    ActionNode(const std::string& name, UpdateFunc func)
        : BehaviorNode(name, NodeType::Action), m_func(func) {}
    
    Status update() override {
        if (m_func) {
            return m_func();
        }
        return Status::Failure();
    }
    
private:
    UpdateFunc m_func;
};

// ============================================================
// Condition Node
// ============================================================

class ConditionNode : public BehaviorNode {
public:
    ConditionNode(const std::string& name, UpdateFunc func)
        : BehaviorNode(name, NodeType::Condition), m_func(func) {}
    
    Status update() override {
        if (m_func) {
            return m_func();
        }
        return Status::Failure();
    }
    
private:
    UpdateFunc m_func;
};

// ============================================================
// Composite Nodes
// ============================================================

class CompositeNode : public BehaviorNode {
public:
    CompositeNode(const std::string& name, CompositeType type)
        : BehaviorNode(name, NodeType::Composite), m_compositeType(type) {}
    
    CompositeType getCompositeType() const { return m_compositeType; }
    
protected:
    CompositeType m_compositeType;
};

// Sequence - runs children in order until one fails
class SequenceNode : public CompositeNode {
public:
    SequenceNode() : CompositeNode("Sequence", CompositeType::Sequence) {}
    
    Status update() override {
        for (auto* child : m_children) {
            if (!child->isEnabled()) continue;
            
            Status result = child->update();
            
            if (result.isFailure()) {
                return Status::Failure();
            }
            
            if (result.isRunning()) {
                return Status::Running();
            }
        }
        
        return Status::Success();
    }
};

// Selector - runs children in order until one succeeds
class SelectorNode : public CompositeNode {
public:
    SelectorNode() : CompositeNode("Selector", CompositeType::Selector) {}
    
    Status update() override {
        for (auto* child : m_children) {
            if (!child->isEnabled()) continue;
            
            Status result = child->update();
            
            if (result.isSuccess()) {
                return Status::Success();
            }
            
            if (result.isRunning()) {
                return Status::Running();
            }
        }
        
        return Status::Failure();
    }
};

// ============================================================
// Decorator Nodes
// ============================================================

class DecoratorNode : public BehaviorNode {
public:
    DecoratorNode(const std::string& name, DecoratorType type)
        : BehaviorNode(name, NodeType::Decorator), m_decoratorType(type) {}
    
    DecoratorType getDecoratorType() const { return m_decoratorType; }
    void setChild(BehaviorNode* child) { 
        m_children.clear();
        if (child) m_children.push_back(child);
    }
    
protected:
    DecoratorType m_decoratorType;
};

class InverterNode : public DecoratorNode {
public:
    InverterNode() : DecoratorNode("Inverter", DecoratorType::Inverter) {}
    
    Status update() override {
        if (m_children.empty()) return Status::Failure();
        
        Status result = m_children[0]->update();
        
        if (result.isSuccess()) return Status::Failure();
        if (result.isFailure()) return Status::Success();
        return Status::Running();
    }
};

class RepeaterNode : public DecoratorNode {
public:
    RepeaterNode(int count = -1) 
        : DecoratorNode("Repeater", DecoratorType::Repeater), 
          m_repeatCount(count), m_currentCount(0) {}
    
    void reset() override {
        m_currentCount = 0;
        for (auto* child : m_children) child->reset();
    }
    
    Status update() override {
        if (m_children.empty()) return Status::Failure();
        
        Status result = m_children[0]->update();
        
        if (result.isDone()) {
            m_children[0]->reset();
            
            if (m_repeatCount > 0) {
                m_currentCount++;
                if (m_currentCount >= m_repeatCount) {
                    return Status::Success();
                }
            }
        }
        
        return Status::Running();
    }
    
private:
    int m_repeatCount;  // -1 = infinite
    int m_currentCount = 0;
};

// ============================================================
// Behavior Tree
// ============================================================

class BehaviorTree {
public:
    BehaviorTree();
    ~BehaviorTree();
    
    void setRoot(BehaviorNode* root);
    BehaviorNode* getRoot() const { return m_root; }
    
    Status tick();
    void reset();
    
    void addDecorator(BehaviorNode* node, DecoratorType type);
    
    // Debug
    std::string getDebugString() const;
    void setDebugMode(bool enabled) { m_debugMode = enabled; }
    
private:
    BehaviorNode* m_root = nullptr;
    bool m_debugMode = false;
};

// ============================================================
// AI Agent (FSM + Behavior Tree)
// ============================================================

class AIAgent {
public:
    AIAgent();
    ~AIAgent();
    
    void setEntity(Entity* entity) { m_entity = entity; }
    Entity* getEntity() const { return m_entity; }
    
    void setBehaviorTree(BehaviorTree* tree);
    void update(float deltaTime);
    
    // State machine
    void addState(const std::string& name);
    void setState(const std::string& state);
    const std::string& getCurrentState() const { return m_currentState; }
    
    void addTransition(const std::string& from, const std::string& to, UpdateFunc condition);
    
    // Parameters
    void setFloat(const std::string& name, float value);
    void setInt(const std::string& name, int value);
    void setBool(const std::string& name, bool value);
    
    float getFloat(const std::string& name) const;
    int getInt(const std::string& name) const;
    bool getBool(const std::string& name) const;
    
private:
    Entity* m_entity = nullptr;
    std::unique_ptr<BehaviorTree> m_behaviorTree;
    
    // FSM
    std::string m_currentState;
    std::map<std::string, BehaviorNode*> m_states;
    struct Transition {
        std::string from;
        std::string to;
        UpdateFunc condition;
    };
    std::vector<Transition> m_transitions;
    
    // Parameters
    std::map<std::string, float> m_floats;
    std::map<std::string, int> m_ints;
    std::map<std::string, bool> m_bools;
    
    float m_updateInterval = 0.1f;
    float m_updateTimer = 0.0f;
};

// ============================================================
// Behavior Tree Factory
// ============================================================

class BehaviorTreeFactory {
public:
    static BehaviorTree* createPatrol(const std::vector<Vector3>& waypoints);
    static BehaviorTree* createChase(float detectionRange);
    static BehaviorTree* createAttack(float attackRange);
    static BehaviorTree* createFlee(float fleeDistance);
    static BehaviorTree* createWander(float radius);
    static BehaviorTree* createFollow(Entity* target, float followDistance);
};

} // namespace kevla
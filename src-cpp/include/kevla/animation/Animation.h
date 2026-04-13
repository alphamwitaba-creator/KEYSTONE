#pragma once

#include <vector>
#include <string>
#include <map>
#include <memory>
#include "kevla/Vector.h"
#include "kevla/Matrix.h"

namespace kevla {

// ============================================================
// Animation Types
// ============================================================

enum class AnimationInterpolation {
    Constant,
    Linear,
    Bezier,
    Cubic
};

enum class AnimationWrapMode {
    Once,
    Loop,
    PingPong,
    Clamp
};

// ============================================================
// Keyframe
// ============================================================

struct TransformKeyframe {
    float time = 0.0f;
    Vector3 position = Vector3::Zero();
    Vector3 rotation = Vector3::Zero();
    Vector3 scale = Vector3::One();
    
    Vector3 linearTangentIn;
    Vector3 linearTangentOut;
};

struct FloatKeyframe {
    float time = 0.0f;
    float value = 0.0f;
    float tangentIn = 0.0f;
    float tangentOut = 0.0f;
};

struct VectorKeyframe {
    float time = 0.0f;
    Vector3 value = Vector3::Zero();
    Vector3 tangentIn = Vector3::Zero();
    Vector3 tangentOut = Vector3::Zero();
};

struct BoolKeyframe {
    float time = 0.0f;
    bool value = false;
};

// ============================================================
// Animation Track
// ============================================================

class AnimationTrack {
public:
    AnimationTrack();
    ~AnimationTrack() = default;
    
    void setTarget(int targetIndex) { m_targetIndex = targetIndex; }
    int getTarget() const { return m_targetIndex; }
    
    void setInterpolation(AnimationInterpolation interp) { m_interpolation = interp; }
    AnimationInterpolation getInterpolation() const { return m_interpolation; }
    
    void addTransformKeyframe(const TransformKeyframe& keyframe);
    void addFloatKeyframe(const FloatKeyframe& keyframe);
    void addVectorKeyframe(const VectorKeyframe& keyframe);
    void addBoolKeyframe(const BoolKeyframe& keyframe);
    
    const std::vector<TransformKeyframe>& getTransformKeyframes() const { return m_transformKeyframes; }
    const std::vector<FloatKeyframe>& getFloatKeyframes() const { return m_floatKeyframes; }
    const std::vector<VectorKeyframe>& getVectorKeyframes() const { return m_vectorKeyframes; }
    
    TransformKeyframe getTransformAtTime(float time) const;
    float getFloatAtTime(float time) const;
    Vector3 getVectorAtTime(float time) const;
    bool getBoolAtTime(float time) const;
    
    void optimize();
    
private:
    int m_targetIndex = -1;
    AnimationInterpolation m_interpolation = AnimationInterpolation::Linear;
    
    std::vector<TransformKeyframe> m_transformKeyframes;
    std::vector<FloatKeyframe> m_floatKeyframes;
    std::vector<VectorKeyframe> m_vectorKeyframes;
    std::vector<BoolKeyframe> m_boolKeyframes;
};

// ============================================================
// Animation
// ============================================================

class Animation {
public:
    Animation();
    Animation(const std::string& name, float duration = 1.0f);
    ~Animation() = default;
    
    void setName(const std::string& name) { m_name = name; }
    const std::string& getName() const { return m_name; }
    
    void setDuration(float duration) { m_duration = duration; }
    float getDuration() const { return m_duration; }
    
    void setTicksPerSecond(float tps) { m_ticksPerSecond = tps; }
    float getTicksPerSecond() const { return m_ticksPerSecond; }
    
    void setWrapMode(AnimationWrapMode mode) { m_wrapMode = mode; }
    AnimationWrapMode getWrapMode() const { return m_wrapMode; }
    
    void addTrack(AnimationTrack* track);
    AnimationTrack* getTrack(int index);
    const std::vector<AnimationTrack*>& getTracks() const { return m_tracks; }
    
    float getDurationInSeconds() const;
    
private:
    std::string m_name;
    float m_duration = 1.0f;
    float m_ticksPerSecond = 30.0f;
    AnimationWrapMode m_wrapMode = AnimationWrapMode::Loop;
    std::vector<AnimationTrack*> m_tracks;
};

// ============================================================
// Skeleton Bone
// ============================================================

class Bone {
public:
    Bone();
    Bone(int index, const std::string& name, const Matrix4& localBindPose);
    ~Bone() = default;
    
    void setIndex(int index) { m_index = index; }
    int getIndex() const { return m_index; }
    
    void setName(const std::string& name) { m_name = name; }
    const std::string& getName() const { return m_name; }
    
    void setLocalBindPose(const Matrix4& matrix) { m_localBindPose = matrix; }
    const Matrix4& getLocalBindPose() const { return m_localBindPose; }
    
    void setWorldBindPose(const Matrix4& matrix) { m_worldBindPose = matrix; }
    const Matrix4& getWorldBindPose() const { return m_worldBindPose; }
    
    void setInverseBindPose(const Matrix4& matrix) { m_inverseBindPose = matrix; }
    const Matrix4& getInverseBindPose() const { return m_inverseBindPose; }
    
    void setParent(int parent) { m_parent = parent; }
    int getParent() const { return m_parent; }
    
    void addChild(int child) { m_children.push_back(child); }
    const std::vector<int>& getChildren() const { return m_children; }
    
private:
    int m_index = -1;
    std::string m_name;
    Matrix4 m_localBindPose;
    Matrix4 m_worldBindPose;
    Matrix4 m_inverseBindPose;
    int m_parent = -1;
    std::vector<int> m_children;
};

// ============================================================
// Skeleton
// ============================================================

class Skeleton {
public:
    Skeleton();
    ~Skeleton();
    
    void addBone(Bone* bone);
    Bone* getBone(int index);
    Bone* getBoneByName(const std::string& name);
    
    int getBoneCount() const { return (int)m_bones.size(); }
    
    void calculateBindPose();
    const std::vector<Matrix4>& getInverseBindPoses() const { return m_inverseBindPoses; }
    
    void setRootBone(int index) { m_rootBone = index; }
    int getRootBone() const { return m_rootBone; }
    
private:
    std::vector<Bone*> m_bones;
    std::vector<Matrix4> m_inverseBindPoses;
    std::map<std::string, int> m_boneNameMap;
    int m_rootBone = -1;
};

// ============================================================
// Skinned Mesh
// ============================================================

struct BoneInfluence {
    int boneIndex = -1;
    float weight = 0.0f;
};

struct SkinnedVertex {
    Vector3 position;
    Vector3 normal;
    Vector2 uv;
    Vector4 color;
    std::vector<BoneInfluence> boneInfluences;
};

// ============================================================
// Animation Controller
// ============================================================

class AnimationController {
public:
    AnimationController();
    ~AnimationController() = default;
    
    void setSkeleton(Skeleton* skeleton) { m_skeleton = skeleton; }
    Skeleton* getSkeleton() const { return m_skeleton; }
    
    void setAnimation(Animation* animation);
    Animation* getAnimation() const { return m_currentAnimation; }
    
    void play();
    void pause();
    void stop();
    
    void setWrapMode(AnimationWrapMode mode);
    void setPlaybackSpeed(float speed) { m_playbackSpeed = speed; }
    float getPlaybackSpeed() const { return m_playbackSpeed; }
    
    void setTime(float time);
    float getTime() const { return m_currentTime; }
    
    void update(float deltaTime);
    
    bool isPlaying() const { return m_playing; }
    bool isPaused() const { return m_paused; }
    
    void blendTo(Animation* animation, float blendDuration);
    bool isBlending() const { return m_blending && m_blendTime < m_blendDuration; }
    
    const std::vector<Matrix4>& getBoneMatrices() { return m_boneMatrices; }
    
private:
    void updateBoneMatrices();
    float wrapTime(float time);
    
    Skeleton* m_skeleton = nullptr;
    Animation* m_currentAnimation = nullptr;
    Animation* m_targetAnimation = nullptr;
    
    bool m_playing = false;
    bool m_paused = false;
    float m_currentTime = 0.0f;
    float m_playbackSpeed = 1.0f;
    AnimationWrapMode m_wrapMode = AnimationWrapMode::Loop;
    
    bool m_blending = false;
    float m_blendTime = 0.0f;
    float m_blendDuration = 0.3f;
    
    std::vector<Matrix4> m_boneMatrices;
};

// ============================================================
// Animation Mixer (multiple animations)
// ============================================================

class AnimationMixer {
public:
    AnimationMixer();
    ~AnimationMixer() = default;
    
    void addController(AnimationController* controller, const std::string& name);
    void removeController(const std::string& name);
    AnimationController* getController(const std::string& name);
    
    void update(float deltaTime);
    
    void playAll();
    void stopAll();
    
private:
    std::map<std::string, AnimationController*> m_controllers;
};

// ============================================================
// Animation Importer
// ============================================================

class AnimationImporter {
public:
    static Animation* importFromGLTF(const std::string& path);
    static Animation* importFromKEVLA(const std::string& path);
    static Animation* importFromFBX(const std::string& path);
    
    static Skeleton* importSkeleton(const std::string& path);
    static bool importSkeletalAnimation(const std::string& path, Skeleton* skeleton, Animation*& outAnimation);
};

} // namespace kevla
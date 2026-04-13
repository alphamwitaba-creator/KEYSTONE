#include "kevla/animation/Animation.h"
#include <cmath>
#include <algorithm>

namespace kevla {

// ============================================================
// AnimationTrack Implementation
// ============================================================

AnimationTrack::AnimationTrack()
    : m_targetIndex(-1)
    , m_interpolation(AnimationInterpolation::Linear)
{
}

void AnimationTrack::addTransformKeyframe(const TransformKeyframe& keyframe) {
    m_transformKeyframes.push_back(keyframe);
    sort(m_transformKeyframes.begin(), m_transformKeyframes.end(),
        [](const TransformKeyframe& a, const TransformKeyframe& b) {
            return a.time < b.time;
        });
}

void AnimationTrack::addFloatKeyframe(const FloatKeyframe& keyframe) {
    m_floatKeyframes.push_back(keyframe);
    sort(m_floatKeyframes.begin(), m_floatKeyframes.end(),
        [](const FloatKeyframe& a, const FloatKeyframe& b) {
            return a.time < b.time;
        });
}

void AnimationTrack::addVectorKeyframe(const VectorKeyframe& keyframe) {
    m_vectorKeyframes.push_back(keyframe);
    sort(m_vectorKeyframes.begin(), m_vectorKeyframes.end(),
        [](const VectorKeyframe& a, const VectorKeyframe& b) {
            return a.time < b.time;
        });
}

void AnimationTrack::addBoolKeyframe(const BoolKeyframe& keyframe) {
    m_boolKeyframes.push_back(keyframe);
    sort(m_boolKeyframes.begin(), m_boolKeyframes.end(),
        [](const BoolKeyframe& a, const BoolKeyframe& b) {
            return a.time < b.time;
        });
}

TransformKeyframe AnimationTrack::getTransformAtTime(float time) const {
    if (m_transformKeyframes.empty()) {
        return TransformKeyframe();
    }
    
    if (time <= m_transformKeyframes.front().time) {
        return m_transformKeyframes.front();
    }
    
    if (time >= m_transformKeyframes.back().time) {
        return m_transformKeyframes.back();
    }
    
    for (size_t i = 0; i < m_transformKeyframes.size() - 1; i++) {
        const auto& k1 = m_transformKeyframes[i];
        const auto& k2 = m_transformKeyframes[i + 1];
        
        if (time >= k1.time && time <= k2.time) {
            float t = (time - k1.time) / (k2.time - k1.time);
            
            TransformKeyframe result;
            result.time = time;
            result.position = k1.position + (k2.position - k1.position) * t;
            result.rotation = k1.rotation + (k2.rotation - k1.rotation) * t;
            result.scale = k1.scale + (k2.scale - k1.scale) * t;
            
            return result;
        }
    }
    
    return m_transformKeyframes.front();
}

float AnimationTrack::getFloatAtTime(float time) const {
    if (m_floatKeyframes.empty()) return 0.0f;
    
    if (time <= m_floatKeyframes.front().time) return m_floatKeyframes.front().value;
    if (time >= m_floatKeyframes.back().time) return m_floatKeyframes.back().value;
    
    for (size_t i = 0; i < m_floatKeyframes.size() - 1; i++) {
        const auto& k1 = m_floatKeyframes[i];
        const auto& k2 = m_floatKeyframes[i + 1];
        
        if (time >= k1.time && time <= k2.time) {
            float t = (time - k1.time) / (k2.time - k1.time);
            return k1.value + (k2.value - k1.value) * t;
        }
    }
    
    return 0.0f;
}

Vector3 AnimationTrack::getVectorAtTime(float time) const {
    if (m_vectorKeyframes.empty()) return Vector3::Zero();
    
    if (time <= m_vectorKeyframes.front().time) return m_vectorKeyframes.front().value;
    if (time >= m_vectorKeyframes.back().time) return m_vectorKeyframes.back().value;
    
    for (size_t i = 0; i < m_vectorKeyframes.size() - 1; i++) {
        const auto& k1 = m_vectorKeyframes[i];
        const auto& k2 = m_vectorKeyframes[i + 1];
        
        if (time >= k1.time && time <= k2.time) {
            float t = (time - k1.time) / (k2.time - k1.time);
            return k1.value + (k2.value - k1.value) * t;
        }
    }
    
    return Vector3::Zero();
}

bool AnimationTrack::getBoolAtTime(float time) const {
    if (m_boolKeyframes.empty()) return false;
    
    for (auto it = m_boolKeyframes.rbegin(); it != m_boolKeyframes.rend(); ++it) {
        if (time >= it->time) {
            return it->value;
        }
    }
    
    return m_boolKeyframes.front().value;
}

void AnimationTrack::optimize() {
}

// ============================================================
// Animation Implementation
// ============================================================

Animation::Animation()
    : m_name("Animation")
    , m_duration(1.0f)
    , m_ticksPerSecond(30.0f)
    , m_wrapMode(AnimationWrapMode::Loop)
{
}

Animation::Animation(const std::string& name, float duration)
    : m_name(name)
    , m_duration(duration)
    , m_ticksPerSecond(30.0f)
    , m_wrapMode(AnimationWrapMode::Loop)
{
}

void Animation::addTrack(AnimationTrack* track) {
    m_tracks.push_back(track);
}

AnimationTrack* Animation::getTrack(int index) {
    if (index >= 0 && index < (int)m_tracks.size()) {
        return m_tracks[index];
    }
    return nullptr;
}

float Animation::getDurationInSeconds() const {
    return m_duration / m_ticksPerSecond;
}

// ============================================================
// Bone Implementation
// ============================================================

Bone::Bone()
    : m_index(-1)
    , m_parent(-1)
{
}

Bone::Bone(int index, const std::string& name, const Matrix4& localBindPose)
    : m_index(index)
    , m_name(name)
    , m_localBindPose(localBindPose)
    , m_parent(-1)
{
}

// ============================================================
// Skeleton Implementation
// ============================================================

Skeleton::Skeleton()
    : m_rootBone(-1)
{
}

Skeleton::~Skeleton() {
    for (auto* bone : m_bones) {
        delete bone;
    }
    m_bones.clear();
}

void Skeleton::addBone(Bone* bone) {
    m_bones.push_back(bone);
    m_boneNameMap[bone->getName()] = bone->getIndex();
    m_inverseBindPoses.push_back(Matrix4::Identity());
}

Bone* Skeleton::getBone(int index) {
    if (index >= 0 && index < (int)m_bones.size()) {
        return m_bones[index];
    }
    return nullptr;
}

Bone* Skeleton::getBoneByName(const std::string& name) {
    auto it = m_boneNameMap.find(name);
    if (it != m_boneNameMap.end()) {
        return m_bones[it->second];
    }
    return nullptr;
}

void Skeleton::calculateBindPose() {
    for (size_t i = 0; i < m_bones.size(); i++) {
        Bone* bone = m_bones[i];
        
        if (bone->getParent() == -1) {
            bone->setWorldBindPose(bone->getLocalBindPose());
        } else {
            Bone* parent = getBone(bone->getParent());
            if (parent) {
                bone->setWorldBindPose(parent->getWorldBindPose() * bone->getLocalBindPose());
            }
        }
        
        m_inverseBindPoses[i] = bone->getWorldBindPose();
    }
}

// ============================================================
// AnimationController Implementation
// ============================================================

AnimationController::AnimationController()
    : m_skeleton(nullptr)
    , m_currentAnimation(nullptr)
    , m_playing(false)
    , m_paused(false)
    , m_currentTime(0.0f)
    , m_playbackSpeed(1.0f)
    , m_wrapMode(AnimationWrapMode::Loop)
    , m_blending(false)
    , m_blendTime(0.0f)
    , m_blendDuration(0.3f)
{
}

void AnimationController::setAnimation(Animation* animation) {
    m_currentAnimation = animation;
    m_currentTime = 0.0f;
    
    if (animation && m_skeleton) {
        m_boneMatrices.resize(m_skeleton->getBoneCount(), Matrix4::Identity());
    }
}

void AnimationController::play() {
    m_playing = true;
    m_paused = false;
}

void AnimationController::pause() {
    m_paused = true;
}

void AnimationController::stop() {
    m_playing = false;
    m_paused = false;
    m_currentTime = 0.0f;
}

void AnimationController::setWrapMode(AnimationWrapMode mode) {
    m_wrapMode = mode;
    if (m_currentAnimation) {
        m_currentAnimation->setWrapMode(mode);
    }
}

void AnimationController::setTime(float time) {
    m_currentTime = time;
    if (m_currentAnimation) {
        if (m_currentTime > m_currentAnimation->getDuration()) {
            m_currentTime = wrapTime(m_currentTime);
        }
    }
}

void AnimationController::update(float deltaTime) {
    if (!m_playing || m_paused || !m_currentAnimation) return;
    
    m_currentTime += deltaTime * m_playbackSpeed * m_currentAnimation->getTicksPerSecond();
    
    if (m_currentTime > m_currentAnimation->getDuration()) {
        m_currentTime = wrapTime(m_currentTime);
    }
    
    if (m_blending) {
        m_blendTime += deltaTime * m_playbackSpeed;
    }
    
    updateBoneMatrices();
}

void AnimationController::updateBoneMatrices() {
    if (!m_currentAnimation || !m_skeleton) return;
    
    const auto& tracks = m_currentAnimation->getTracks();
    
    for (auto* track : tracks) {
        int boneIndex = track->getTarget();
        if (boneIndex < 0 || boneIndex >= (int)m_boneMatrices.size()) continue;
        
        TransformKeyframe keyframe = track->getTransformAtTime(m_currentTime);
        
        Matrix4 translation = Matrix4::Translation(keyframe.position);
        
        Matrix4 rotationX = Matrix4::Rotation(keyframe.rotation.x, Vector3::Right());
        Matrix4 rotationY = Matrix4::Rotation(keyframe.rotation.y, Vector3::Up());
        Matrix4 rotationZ = Matrix4::Rotation(keyframe.rotation.z, Vector3::Forward());
        Matrix4 rotation = rotationY * rotationX * rotationZ;
        
        Matrix4 scale = Matrix4::Scale(keyframe.scale);
        
        Matrix4 localTransform = translation * rotation * scale;
        
        const auto& invBindPoses = m_skeleton->getInverseBindPoses();
        if (boneIndex < (int)invBindPoses.size()) {
            m_boneMatrices[boneIndex] = localTransform * invBindPoses[boneIndex];
        }
    }
}

float AnimationController::wrapTime(float time) {
    if (!m_currentAnimation) return 0.0f;
    
    float duration = m_currentAnimation->getDuration();
    
    switch (m_wrapMode) {
        case AnimationWrapMode::Once:
            return std::min(time, duration);
            
        case AnimationWrapMode::Loop:
            while (time > duration) {
                time -= duration;
            }
            return time;
            
        case AnimationWrapMode::PingPong: {
            float cycles = time / duration;
            int cycle = (int)cycles;
            float phase = cycles - cycle;
            
            if (cycle % 2 == 0) {
                return phase * duration;
            } else {
                return (1.0f - phase) * duration;
            }
        }
        
        case AnimationWrapMode::Clamp:
            return std::min(std::max(time, 0.0f), duration);
    }
    
    return time;
}

void AnimationController::blendTo(Animation* animation, float blendDuration) {
    m_targetAnimation = animation;
    m_blending = true;
    m_blendTime = 0.0f;
    m_blendDuration = blendDuration;
}

// ============================================================
// AnimationMixer Implementation
// ============================================================

AnimationMixer::AnimationMixer() {
}

void AnimationMixer::addController(AnimationController* controller, const std::string& name) {
    m_controllers[name] = controller;
}

void AnimationMixer::removeController(const std::string& name) {
    m_controllers.erase(name);
}

AnimationController* AnimationMixer::getController(const std::string& name) {
    auto it = m_controllers.find(name);
    if (it != m_controllers.end()) {
        return it->second;
    }
    return nullptr;
}

void AnimationMixer::update(float deltaTime) {
    for (auto& [name, controller] : m_controllers) {
        (void)name;
        controller->update(deltaTime);
    }
}

void AnimationMixer::playAll() {
    for (auto& [name, controller] : m_controllers) {
        (void)name;
        controller->play();
    }
}

void AnimationMixer::stopAll() {
    for (auto& [name, controller] : m_controllers) {
        (void)name;
        controller->stop();
    }
}

// ============================================================
// AnimationImporter Implementation
// ============================================================

Animation* AnimationImporter::importFromGLTF(const std::string& path) {
    (void)path;
    return nullptr;
}

Animation* AnimationImporter::importFromKEVLA(const std::string& path) {
    (void)path;
    return nullptr;
}

Animation* AnimationImporter::importFromFBX(const std::string& path) {
    (void)path;
    return nullptr;
}

Skeleton* AnimationImporter::importSkeleton(const std::string& path) {
    (void)path;
    return nullptr;
}

bool AnimationImporter::importSkeletalAnimation(const std::string& path, Skeleton* skeleton, Animation*& outAnimation) {
    (void)path;
    (void)skeleton;
    outAnimation = nullptr;
    return false;
}

} // namespace kevla
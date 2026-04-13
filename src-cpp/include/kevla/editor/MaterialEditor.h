#pragma once

#include <vector>
#include <string>
#include <memory>
#include <map>
#include "kevla/Vector.h"

namespace kevla {

// ============================================================
// Material Types
// ============================================================

enum class MaterialType {
    Standard,
    PBR,
    Unlit,
    Custom,
    Subsurface,
    Hair,
    Particle
};

// ============================================================
// Material Property Types
// ============================================================

enum class MaterialPropertyType {
    Float,
    Float2,
    Float3,
    Float4,
    Int,
    Bool,
    Texture2D,
    TextureCube,
    Color
};

// ============================================================
// Material Property
// ============================================================

struct MaterialProperty {
    std::string name;
    std::string displayName;
    MaterialPropertyType type;
    
    // Float values
    float floatValue = 0.0f;
    Vector2 float2Value = Vector2::Zero();
    Vector3 float3Value = Vector3::Zero();
    Vector4 float4Value = Vector4::Zero();
    
    // Integer values
    int intValue = 0;
    
    // Boolean
    bool boolValue = false;
    
    // Texture
    std::string texturePath;
    int textureId = -1;
    
    // Limits
    float minValue = 0.0f;
    float maxValue = 1.0f;
    float softMin = 0.0f;
    float softMax = 1.0f;
    
    // Flags
    bool isShaderInput = true;
    bool isVisible = true;
    bool isAdvanced = false;
};

// ============================================================
// Material Preset
// ============================================================

class MaterialPreset {
public:
    MaterialPreset() = default;
    MaterialPreset(const std::string& name);
    ~MaterialPreset() = default;
    
    void setName(const std::string& name) { m_name = name; }
    const std::string& getName() const { return m_name; }
    
    void addProperty(const MaterialProperty& prop);
    const std::vector<MaterialProperty>& getProperties() const { return m_properties; }
    
    static MaterialPreset* createDefault();
    static MaterialPreset* createMetal();
    static MaterialPreset* createPlastic();
    static MaterialPreset* createWood();
    static MaterialPreset* createFabric();
    static MaterialPreset* createGlass();
    
private:
    std::string m_name;
    std::vector<MaterialProperty> m_properties;
};

// ============================================================
// Shader Graph Node
// ============================================================

enum class ShaderNodeType {
    // Inputs
    TextureSample,
    Color,
    Value,
    Vector2,
    Vector3,
    Vector4,
    
    // Math
    Add,
    Subtract,
    Multiply,
    Divide,
    Power,
    Sqrt,
    Abs,
    Sign,
    Floor,
    Ceil,
    Fract,
    Mod,
    Min,
    Max,
    Clamp,
    Lerp,
    Smoothstep,
    
    // Vector
    Dot,
    Cross,
    Normalize,
    Length,
    Distance,
    
    // Texturing
    NormalMap,
    HeightMap,
    Triplanar,
    Voronoi,
    Gradient,
    Noise,
    
    // Output
    FragmentOutput,
    VertexOutput
};

class ShaderNode {
public:
    ShaderNode(const std::string& id, ShaderNodeType type, const std::string& name);
    ~ShaderNode() = default;
    
    std::string getId() const { return m_id; }
    ShaderNodeType getType() const { return m_type; }
    std::string getName() const { return m_name; }
    
    void setPosition(float x, float y) { m_position = {x, y}; }
    Vector2 getPosition() const { return m_position; }
    
    void addInput(const std::string& name, MaterialPropertyType type);
    void addOutput(const std::string& name, MaterialPropertyType type);
    
    struct Socket {
        std::string name;
        MaterialPropertyType type;
        ShaderNode* connectedNode = nullptr;
        std::string connectedSocket;
    };
    
    std::vector<Socket>& getInputs() { return m_inputs; }
    std::vector<Socket>& getOutputs() { return m_outputs; }
    
    void setValue(const std::string& input, float value);
    void setValue(const std::string& input, const Vector3& value);
    float getValueFloat(const std::string& input) const;
    Vector3 getValueVector3(const std::string& input) const;
    
private:
    std::string m_id;
    ShaderNodeType m_type;
    std::string m_name;
    Vector2 m_position;
    std::vector<Socket> m_inputs;
    std::vector<Socket> m_outputs;
    std::map<std::string, float> m_floatValues;
    std::map<std::string, Vector3> m_vectorValues;
};

// ============================================================
// Shader Graph
// ============================================================

class ShaderGraph {
public:
    ShaderGraph();
    ~ShaderGraph();
    
    void clear();
    
    ShaderNode* addNode(ShaderNodeType type, const std::string& name);
    void removeNode(const std::string& nodeId);
    ShaderNode* getNode(const std::string& nodeId);
    
    void connect(ShaderNode* fromNode, const std::string& fromSocket,
                 ShaderNode* toNode, const std::string& toSocket);
    void disconnect(ShaderNode* node, const std::string& socket);
    
    std::string generateShaderCode() const;
    
    const std::vector<ShaderNode*>& getNodes() const { return m_nodes; }
    
private:
    std::vector<ShaderNode*> m_nodes;
    std::string generateNodeCode(ShaderNode* node) const;
};

// ============================================================
// Material Editor
// ============================================================

class MaterialEditor {
public:
    MaterialEditor();
    ~MaterialEditor();
    
    void initialize();
    void shutdown();
    
    // Material management
    void setMaterial(class Material* material);
    Material* getMaterial() const { return m_material; }
    
    void createNewMaterial(MaterialType type);
    void loadMaterial(const std::string& path);
    void saveMaterial(const std::string& path);
    
    // Property editing
    void setPropertyValue(const std::string& name, float value);
    void setPropertyValue(const std::string& name, const Vector3& value);
    void setPropertyValue(const std::string& name, const Color& value);
    void setPropertyTexture(const std::string& name, const std::string& path);
    
    float getPropertyFloat(const std::string& name) const;
    Vector3 getPropertyVector3(const std::string& name) const;
    Color getPropertyColor(const std::string& name) const;
    std::string getPropertyTexture(const std::string& name) const;
    
    // Presets
    void applyPreset(MaterialPreset* preset);
    
    // Shader graph
    void setShaderGraph(ShaderGraph* graph) { m_shaderGraph.reset(graph); }
    ShaderGraph* getShaderGraph() const { return m_shaderGraph.get(); }
    
    // Preview
    void renderPreview(class Renderer* renderer);
    void setPreviewMesh(class Mesh* mesh);
    
    // UI
    void render();
    void renderPropertyEditor();
    void renderTexturePicker();
    void renderPresetBrowser();
    
private:
    Material* m_material = nullptr;
    std::unique_ptr<ShaderGraph> m_shaderGraph;
    
    int m_selectedProperty = -1;
    std::string m_searchFilter;
    
    class Mesh* m_previewMesh = nullptr;
    bool m_initialized = false;
};

// ============================================================
// Material Library
// ============================================================

class MaterialLibrary {
public:
    MaterialLibrary();
    ~MaterialLibrary() = default;
    
    void initialize();
    void shutdown();
    
    Material* createMaterial(const std::string& name, MaterialType type);
    Material* getMaterial(const std::string& name);
    void deleteMaterial(const std::string& name);
    
    std::vector<Material*> getAllMaterials() const;
    std::vector<Material*> searchMaterials(const std::string& query) const;
    
    void loadMaterialLibrary(const std::string& path);
    void saveMaterialLibrary(const std::string& path);
    
private:
    std::map<std::string, class Material*> m_materials;
    bool m_initialized = false;
};

} // namespace kevla
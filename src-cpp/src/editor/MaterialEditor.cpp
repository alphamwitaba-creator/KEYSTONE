#include "kevla/editor/MaterialEditor.h"
#include "kevla/render/Material.h"
#include "kevla/render/Mesh.h"
#include "kevla/render/Renderer.h"
#include <algorithm>
#include <sstream>

namespace kevla {

// ============================================================
// MaterialPreset Implementation
// ============================================================

MaterialPreset::MaterialPreset(const std::string& name)
    : m_name(name)
{
}

void MaterialPreset::addProperty(const MaterialProperty& prop) {
    m_properties.push_back(prop);
}

MaterialPreset* MaterialPreset::createDefault() {
    auto preset = new MaterialPreset("Default");
    
    MaterialProperty albedo;
    albedo.name = "albedo";
    albedo.displayName = "Albedo Color";
    albedo.type = MaterialPropertyType::Color;
    albedo.float4Value = {1.0f, 1.0f, 1.0f, 1.0f};
    preset->addProperty(albedo);
    
    MaterialProperty metallic;
    metallic.name = "metallic";
    metallic.displayName = "Metallic";
    metallic.type = MaterialPropertyType::Float;
    metallic.floatValue = 0.0f;
    metallic.minValue = 0.0f;
    metallic.maxValue = 1.0f;
    preset->addProperty(metallic);
    
    MaterialProperty roughness;
    roughness.name = "roughness";
    roughness.displayName = "Roughness";
    roughness.type = MaterialPropertyType::Float;
    roughness.floatValue = 0.5f;
    roughness.minValue = 0.0f;
    roughness.maxValue = 1.0f;
    preset->addProperty(roughness);
    
    return preset;
}

MaterialPreset* MaterialPreset::createMetal() {
    auto preset = new MaterialPreset("Metal");
    
    MaterialProperty albedo;
    albedo.name = "albedo";
    albedo.displayName = "Albedo";
    albedo.type = MaterialPropertyType::Color;
    albedo.float4Value = {0.8f, 0.8f, 0.8f, 1.0f};
    preset->addProperty(albedo);
    
    MaterialProperty metallic;
    metallic.name = "metallic";
    metallic.displayName = "Metallic";
    metallic.type = MaterialPropertyType::Float;
    metallic.floatValue = 1.0f;
    preset->addProperty(metallic);
    
    MaterialProperty roughness;
    roughness.name = "roughness";
    roughness.displayName = "Roughness";
    roughness.type = MaterialPropertyType::Float;
    roughness.floatValue = 0.2f;
    preset->addProperty(roughness);
    
    return preset;
}

MaterialPreset* MaterialPreset::createPlastic() {
    auto preset = new MaterialPreset("Plastic");
    
    MaterialProperty albedo;
    albedo.name = "albedo";
    albedo.displayName = "Color";
    albedo.type = MaterialPropertyType::Color;
    albedo.float4Value = {0.2f, 0.5f, 0.8f, 1.0f};
    preset->addProperty(albedo);
    
    MaterialProperty metallic;
    metallic.name = "metallic";
    metallic.displayName = "Metallic";
    metallic.type = MaterialPropertyType::Float;
    metallic.floatValue = 0.0f;
    preset->addProperty(metallic);
    
    MaterialProperty roughness;
    roughness.name = "roughness";
    roughness.displayName = "Roughness";
    roughness.type = MaterialPropertyType::Float;
    roughness.floatValue = 0.4f;
    preset->addProperty(roughness);
    
    return preset;
}

MaterialPreset* MaterialPreset::createWood() {
    auto preset = new MaterialPreset("Wood");
    
    MaterialProperty albedo;
    albedo.name = "albedo";
    albedo.displayName = "Base Color";
    albedo.type = MaterialPropertyType::Color;
    albedo.float4Value = {0.55f, 0.35f, 0.2f, 1.0f};
    preset->addProperty(albedo);
    
    MaterialProperty roughness;
    roughness.name = "roughness";
    roughness.displayName = "Roughness";
    roughness.type = MaterialPropertyType::Float;
    roughness.floatValue = 0.7f;
    preset->addProperty(roughness);
    
    return preset;
}

MaterialPreset* MaterialPreset::createFabric() {
    auto preset = new MaterialPreset("Fabric");
    
    MaterialProperty albedo;
    albedo.name = "albedo";
    albedo.displayName = "Color";
    albedo.type = MaterialPropertyType::Color;
    albedo.float4Value = {0.9f, 0.9f, 0.9f, 1.0f};
    preset->addProperty(albedo);
    
    MaterialProperty roughness;
    roughness.name = "roughness";
    roughness.displayName = "Roughness";
    roughness.type = MaterialPropertyType::Float;
    roughness.floatValue = 0.9f;
    preset->addProperty(roughness);
    
    return preset;
}

MaterialPreset* MaterialPreset::createGlass() {
    auto preset = new MaterialPreset("Glass");
    
    MaterialProperty albedo;
    albedo.name = "albedo";
    albedo.displayName = "Color";
    albedo.type = MaterialPropertyType::Color;
    albedo.float4Value = {0.9f, 0.95f, 1.0f, 1.0f};
    preset->addProperty(albedo);
    
    MaterialProperty metallic;
    metallic.name = "metallic";
    metallic.displayName = "Metallic";
    metallic.type = MaterialPropertyType::Float;
    metallic.floatValue = 0.0f;
    preset->addProperty(metallic);
    
    MaterialProperty roughness;
    roughness.name = "roughness";
    roughness.displayName = "Roughness";
    roughness.type = MaterialPropertyType::Float;
    roughness.floatValue = 0.0f;
    preset->addProperty(roughness);
    
    MaterialProperty alpha;
    alpha.name = "alpha";
    alpha.displayName = "Alpha";
    alpha.type = MaterialPropertyType::Float;
    alpha.floatValue = 0.3f;
    alpha.minValue = 0.0f;
    alpha.maxValue = 1.0f;
    preset->addProperty(alpha);
    
    return preset;
}

// ============================================================
// ShaderNode Implementation
// ============================================================

ShaderNode::ShaderNode(const std::string& id, ShaderNodeType type, const std::string& name)
    : m_id(id)
    , m_type(type)
    , m_name(name)
    , m_position(0, 0)
{
}

void ShaderNode::addInput(const std::string& name, MaterialPropertyType type) {
    Socket socket;
    socket.name = name;
    socket.type = type;
    m_inputs.push_back(socket);
}

void ShaderNode::addOutput(const std::string& name, MaterialPropertyType type) {
    Socket socket;
    socket.name = name;
    socket.type = type;
    m_outputs.push_back(socket);
}

void ShaderNode::setValue(const std::string& input, float value) {
    m_floatValues[input] = value;
}

void ShaderNode::setValue(const std::string& input, const Vector3& value) {
    m_vectorValues[input] = value;
}

float ShaderNode::getValueFloat(const std::string& input) const {
    auto it = m_floatValues.find(input);
    if (it != m_floatValues.end()) {
        return it->second;
    }
    return 0.0f;
}

Vector3 ShaderNode::getValueVector3(const std::string& input) const {
    auto it = m_vectorValues.find(input);
    if (it != m_vectorValues.end()) {
        return it->second;
    }
    return Vector3::Zero();
}

// ============================================================
// ShaderGraph Implementation
// ============================================================

ShaderGraph::ShaderGraph() {
}

ShaderGraph::~ShaderGraph() {
    for (auto* node : m_nodes) {
        delete node;
    }
    m_nodes.clear();
}

void ShaderGraph::clear() {
    for (auto* node : m_nodes) {
        delete node;
    }
    m_nodes.clear();
}

ShaderNode* ShaderGraph::addNode(ShaderNodeType type, const std::string& name) {
    std::string id = "node_" + std::to_string(m_nodes.size());
    auto* node = new ShaderNode(id, type, name);
    
    switch (type) {
        case ShaderNodeType::TextureSample:
            node->addInput("UV", MaterialPropertyType::Float2);
            node->addInput("Texture", MaterialPropertyType::Texture2D);
            node->addOutput("RGB", MaterialPropertyType::Float3);
            node->addOutput("A", MaterialPropertyType::Float);
            break;
            
        case ShaderNodeType::Color:
            node->addOutput("RGB", MaterialPropertyType::Float3);
            node->setValue("RGB", Vector3(1, 1, 1));
            break;
            
        case ShaderNodeType::NormalMap:
            node->addInput("RGB", MaterialPropertyType::Float3);
            node->addInput("Strength", MaterialPropertyType::Float);
            node->addOutput("XYZ", MaterialPropertyType::Float3);
            break;
            
        case ShaderNodeType::Add:
        case ShaderNodeType::Subtract:
        case ShaderNodeType::Multiply:
            node->addInput("A", MaterialPropertyType::Float3);
            node->addInput("B", MaterialPropertyType::Float3);
            node->addOutput("Result", MaterialPropertyType::Float3);
            break;
            
        case ShaderNodeType::Lerp:
            node->addInput("A", MaterialPropertyType::Float3);
            node->addInput("B", MaterialPropertyType::Float3);
            node->addInput("T", MaterialPropertyType::Float);
            node->addOutput("Result", MaterialPropertyType::Float3);
            break;
            
        case ShaderNodeType::FragmentOutput:
            node->addInput("BaseColor", MaterialPropertyType::Float3);
            node->addInput("Metallic", MaterialPropertyType::Float);
            node->addInput("Roughness", MaterialPropertyType::Float);
            node->addInput("Normal", MaterialPropertyType::Float3);
            node->addInput("Emission", MaterialPropertyType::Float3);
            break;
            
        default:
            break;
    }
    
    m_nodes.push_back(node);
    return node;
}

void ShaderGraph::removeNode(const std::string& nodeId) {
    auto it = std::find_if(m_nodes.begin(), m_nodes.end(),
        [&nodeId](ShaderNode* n) { return n->getId() == nodeId; });
    if (it != m_nodes.end()) {
        delete *it;
        m_nodes.erase(it);
    }
}

ShaderNode* ShaderGraph::getNode(const std::string& nodeId) {
    for (auto* node : m_nodes) {
        if (node->getId() == nodeId) {
            return node;
        }
    }
    return nullptr;
}

void ShaderGraph::connect(ShaderNode* fromNode, const std::string& fromSocket,
                         ShaderNode* toNode, const std::string& toSocket) {
    (void)fromNode;
    (void)fromSocket;
    (void)toNode;
    (void)toSocket;
}

void ShaderGraph::disconnect(ShaderNode* node, const std::string& socket) {
    (void)node;
    (void)socket;
}

std::string ShaderGraph::generateShaderCode() const {
    std::stringstream code;
    
    code << "#version 330 core\n\n";
    code << "in vec2 uv;\n";
    code << "out vec4 fragColor;\n\n";
    
    for (auto* node : m_nodes) {
        code << generateNodeCode(node);
    }
    
    code << "\nvoid main() {\n";
    code << "    fragColor = vec4(1.0, 1.0, 1.0, 1.0);\n";
    code << "}\n";
    
    return code.str();
}

std::string ShaderGraph::generateNodeCode(ShaderNode* node) const {
    (void)node;
    return "";
}

// ============================================================
// MaterialEditor Implementation
// ============================================================

MaterialEditor::MaterialEditor()
    : m_material(nullptr)
    , m_selectedProperty(-1)
    , m_previewMesh(nullptr)
    , m_initialized(false)
{
}

MaterialEditor::~MaterialEditor() {
    shutdown();
}

void MaterialEditor::initialize() {
    if (m_initialized) return;
    
    m_shaderGraph = std::make_unique<ShaderGraph>();
    m_initialized = true;
}

void MaterialEditor::shutdown() {
    if (!m_initialized) return;
    
    m_shaderGraph.reset();
    m_initialized = false;
}

void MaterialEditor::setMaterial(Material* material) {
    m_material = material;
}

void MaterialEditor::createNewMaterial(MaterialType type) {
    (void)type;
}

void MaterialEditor::loadMaterial(const std::string& path) {
    (void)path;
}

void MaterialEditor::saveMaterial(const std::string& path) {
    (void)path;
}

void MaterialEditor::setPropertyValue(const std::string& name, float value) {
    if (!m_material) return;
    
    if (name == "metallic") {
        m_material->setMetallic(value);
    } else if (name == "roughness") {
        m_material->setRoughness(value);
    } else if (name == "alpha") {
        m_material->setAlpha(value);
    }
}

void MaterialEditor::setPropertyValue(const std::string& name, const Vector3& value) {
    (void)name;
    (void)value;
}

void MaterialEditor::setPropertyValue(const std::string& name, const Color& value) {
    if (!m_material) return;
    
    if (name == "albedo" || name == "BaseColor") {
        m_material->setAlbedo(value);
    } else if (name == "emission") {
        m_material->setEmissive(value);
    }
}

void MaterialEditor::setPropertyTexture(const std::string& name, const std::string& path) {
    (void)name;
    (void)path;
}

float MaterialEditor::getPropertyFloat(const std::string& name) const {
    if (!m_material) return 0.0f;
    
    if (name == "metallic") return m_material->getMetallic();
    if (name == "roughness") return m_material->getRoughness();
    if (name == "alpha") return m_material->getAlpha();
    
    return 0.0f;
}

Vector3 MaterialEditor::getPropertyVector3(const std::string& name) const {
    (void)name;
    return Vector3::Zero();
}

Color MaterialEditor::getPropertyColor(const std::string& name) const {
    if (!m_material) return Color::White();
    
    if (name == "albedo") return m_material->getAlbedo();
    if (name == "emission") return m_material->getEmissive();
    
    return Color::White();
}

std::string MaterialEditor::getPropertyTexture(const std::string& name) const {
    (void)name;
    return "";
}

void MaterialEditor::applyPreset(MaterialPreset* preset) {
    if (!preset || !m_material) return;
    
    for (const auto& prop : preset->getProperties()) {
        if (prop.type == MaterialPropertyType::Float) {
            setPropertyValue(prop.name, prop.floatValue);
        } else if (prop.type == MaterialPropertyType::Color) {
            Color c(prop.float4Value.x, prop.float4Value.y, prop.float4Value.z, prop.float4Value.w);
            setPropertyValue(prop.name, c);
        }
    }
}

void MaterialEditor::renderPreview(Renderer* renderer) {
    (void)renderer;
}

void MaterialEditor::setPreviewMesh(Mesh* mesh) {
    m_previewMesh = mesh;
}

void MaterialEditor::render() {
    renderPropertyEditor();
    renderTexturePicker();
    renderPresetBrowser();
}

void MaterialEditor::renderPropertyEditor() {
}

void MaterialEditor::renderTexturePicker() {
}

void MaterialEditor::renderPresetBrowser() {
}

// ============================================================
// MaterialLibrary Implementation
// ============================================================

MaterialLibrary::MaterialLibrary()
    : m_initialized(false)
{
}

void MaterialLibrary::initialize() {
    if (m_initialized) return;
    
    createMaterial("Default", MaterialType::Standard);
    createMaterial("Metal", MaterialType::PBR);
    createMaterial("Plastic", MaterialType::PBR);
    createMaterial("Wood", MaterialType::Standard);
    createMaterial("Glass", MaterialType::Standard);
    
    m_initialized = true;
}

void MaterialLibrary::shutdown() {
    if (!m_initialized) return;
    
    for (auto& [name, material] : m_materials) {
        delete material;
    }
    m_materials.clear();
    
    m_initialized = false;
}

Material* MaterialLibrary::createMaterial(const std::string& name, MaterialType type) {
    (void)type;
    
    auto* material = new Material();
    material->setName(name);
    m_materials[name] = material;
    return material;
}

Material* MaterialLibrary::getMaterial(const std::string& name) {
    auto it = m_materials.find(name);
    if (it != m_materials.end()) {
        return it->second;
    }
    return nullptr;
}

void MaterialLibrary::deleteMaterial(const std::string& name) {
    auto it = m_materials.find(name);
    if (it != m_materials.end()) {
        delete it->second;
        m_materials.erase(it);
    }
}

std::vector<Material*> MaterialLibrary::getAllMaterials() const {
    std::vector<Material*> result;
    for (auto& [name, material] : m_materials) {
        result.push_back(material);
    }
    return result;
}

std::vector<Material*> MaterialLibrary::searchMaterials(const std::string& query) const {
    std::vector<Material*> result;
    std::string lowerQuery = query;
    std::transform(lowerQuery.begin(), lowerQuery.end(), lowerQuery.begin(), ::tolower);
    
    for (auto& [name, material] : m_materials) {
        std::string lowerName = name;
        std::transform(lowerName.begin(), lowerName.end(), lowerName.begin(), ::tolower);
        
        if (lowerName.find(lowerQuery) != std::string::npos) {
            result.push_back(material);
        }
    }
    return result;
}

void MaterialLibrary::loadMaterialLibrary(const std::string& path) {
    (void)path;
}

void MaterialLibrary::saveMaterialLibrary(const std::string& path) {
    (void)path;
}

} // namespace kevla
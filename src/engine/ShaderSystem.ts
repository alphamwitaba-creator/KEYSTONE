// ============================================================
// KEVLA ENGINE — Shader Graph System v2.0
// Visual node-based shader editor and runtime
// ============================================================

import * as THREE from 'three';
import { type ShaderNode, type ShaderGraph, type ShaderNodeType } from './types';

export class ShaderSystem {
  private shaderCache = new Map<string, THREE.ShaderMaterial>();
  private nodeTemplates = this.getNodeTemplates();

  getNodeTemplates() {
    return {
      input: { category: 'input', outputs: ['out'], create: () => ({ type: 'input' as ShaderNodeType, x: 0, y: 0, inputs: {}, outputs: ['out'], label: 'Input' }) },
      output: { category: 'output', inputs: ['baseColor', 'normal', 'metallic', 'roughness', 'emissive', 'alpha'], create: () => ({ type: 'output' as ShaderNodeType, x: 400, y: 0, inputs: {}, outputs: [], label: 'Output' }) },
      float: { category: 'constant', outputs: ['value'], create: (v = 0) => ({ type: 'float' as ShaderNodeType, x: 0, y: 0, inputs: {}, outputs: ['value'], value: v, label: 'Float' }) },
      color: { category: 'constant', outputs: ['color'], create: () => ({ type: 'color' as ShaderNodeType, x: 0, y: 0, inputs: {}, outputs: ['color'], value: '#ffffff', label: 'Color' }) },
      texture: { category: 'texture', outputs: ['color', 'r', 'g', 'b', 'a'], create: () => ({ type: 'texture' as ShaderNodeType, x: 0, y: 0, inputs: {}, outputs: ['color', 'r', 'g', 'b', 'a'], textureId: '', label: 'Texture' }) },
      add: { category: 'math', inputs: ['a', 'b'], outputs: ['result'], create: () => ({ type: 'add' as ShaderNodeType, x: 0, y: 0, inputs: { a: '', b: '' }, outputs: ['result'], label: 'Add' }) },
      multiply: { category: 'math', inputs: ['a', 'b'], outputs: ['result'], create: () => ({ type: 'multiply' as ShaderNodeType, x: 0, y: 0, inputs: { a: '', b: '' }, outputs: ['result'], label: 'Multiply' }) },
      divide: { category: 'math', inputs: ['a', 'b'], outputs: ['result'], create: () => ({ type: 'divide' as ShaderNodeType, x: 0, y: 0, inputs: { a: '', b: '' }, outputs: ['result'], label: 'Divide' }) },
      subtract: { category: 'math', inputs: ['a', 'b'], outputs: ['result'], create: () => ({ type: 'subtract' as ShaderNodeType, x: 0, y: 0, inputs: { a: '', b: '' }, outputs: ['result'], label: 'Subtract' }) },
      power: { category: 'math', inputs: ['base', 'exp'], outputs: ['result'], create: () => ({ type: 'power' as ShaderNodeType, x: 0, y: 0, inputs: { base: '', exp: '' }, outputs: ['result'], value: 1, label: 'Power' }) },
      sqrt: { category: 'math', inputs: ['value'], outputs: ['result'], create: () => ({ type: 'sqrt' as ShaderNodeType, x: 0, y: 0, inputs: { value: '' }, outputs: ['result'], label: 'Sqrt' }) },
      sin: { category: 'math', inputs: ['value'], outputs: ['result'], create: () => ({ type: 'sin' as ShaderNodeType, x: 0, y: 0, inputs: { value: '' }, outputs: ['result'], label: 'Sin' }) },
      cos: { category: 'math', inputs: ['value'], outputs: ['result'], create: () => ({ type: 'cos' as ShaderNodeType, x: 0, y: 0, inputs: { value: '' }, outputs: ['result'], label: 'Cos' }) },
      mix: { category: 'math', inputs: ['a', 'b', 'factor'], outputs: ['result'], create: () => ({ type: 'mix' as ShaderNodeType, x: 0, y: 0, inputs: { a: '', b: '', factor: '' }, outputs: ['result'], value: 0.5, label: 'Mix' }) },
      clamp: { category: 'math', inputs: ['value', 'min', 'max'], outputs: ['result'], create: () => ({ type: 'clamp' as ShaderNodeType, x: 0, y: 0, inputs: { value: '', min: '', max: '' }, outputs: ['result'], value: 1, label: 'Clamp' }) },
      normalize: { category: 'vector', inputs: ['value'], outputs: ['result'], create: () => ({ type: 'normalize' as ShaderNodeType, x: 0, y: 0, inputs: { value: '' }, outputs: ['result'], label: 'Normalize' }) },
      dot: { category: 'vector', inputs: ['a', 'b'], outputs: ['result'], create: () => ({ type: 'dot' as ShaderNodeType, x: 0, y: 0, inputs: { a: '', b: '' }, outputs: ['result'], label: 'Dot' }) },
      cross: { category: 'vector', inputs: ['a', 'b'], outputs: ['result'], create: () => ({ type: 'cross' as ShaderNodeType, x: 0, y: 0, inputs: { a: '', b: '' }, outputs: ['result'], label: 'Cross' }) },
      reflect: { category: 'vector', inputs: ['incident', 'normal'], outputs: ['result'], create: () => ({ type: 'reflect' as ShaderNodeType, x: 0, y: 0, inputs: { incident: '', normal: '' }, outputs: ['result'], label: 'Reflect' }) },
      fresnel: { category: 'pbr', inputs: ['normal', 'viewDir'], outputs: ['result'], create: () => ({ type: 'fresnel' as ShaderNodeType, x: 0, y: 0, inputs: { normal: '', viewDir: '' }, outputs: ['result'], value: 0.5, label: 'Fresnel' }) },
      uv: { category: 'geometry', outputs: ['uv'], create: () => ({ type: 'uv' as ShaderNodeType, x: 0, y: 0, inputs: {}, outputs: ['uv'], label: 'UV' }) },
      time: { category: 'geometry', outputs: ['time'], create: () => ({ type: 'time' as ShaderNodeType, x: 0, y: 0, inputs: {}, outputs: ['time'], label: 'Time' }) },
      position: { category: 'geometry', outputs: ['position', 'x', 'y', 'z'], create: () => ({ type: 'position' as ShaderNodeType, x: 0, y: 0, inputs: {}, outputs: ['position', 'x', 'y', 'z'], label: 'Position' }) },
      normal: { category: 'geometry', outputs: ['normal', 'x', 'y', 'z'], create: () => ({ type: 'normal' as ShaderNodeType, x: 0, y: 0, inputs: {}, outputs: ['normal', 'x', 'y', 'z'], label: 'Normal' }) },
      viewDir: { category: 'geometry', outputs: ['viewDir'], create: () => ({ type: 'viewDir' as ShaderNodeType, x: 0, y: 0, inputs: {}, outputs: ['viewDir'], label: 'View Dir' }) },
      noise: { category: 'noise', inputs: ['uv', 'scale'], outputs: ['value'], create: () => ({ type: 'noise' as ShaderNodeType, x: 0, y: 0, inputs: { uv: '', scale: '' }, outputs: ['value'], value: 10, label: 'Noise' }) },
      rgb2hsv: { category: 'color', inputs: ['rgb'], outputs: ['h', 's', 'v'], create: () => ({ type: 'rgb2hsv' as ShaderNodeType, x: 0, y: 0, inputs: { rgb: '' }, outputs: ['h', 's', 'v'], label: 'RGB to HSV' }) },
      hsv2rgb: { category: 'color', inputs: ['h', 's', 'v'], outputs: ['rgb'], create: () => ({ type: 'hsv2rgb' as ShaderNodeType, x: 0, y: 0, inputs: { h: '', s: '', v: '' }, outputs: ['rgb'], label: 'HSV to RGB' }) },
    };
  }

  compileGraph(graph: ShaderGraph, textures: Map<string, THREE.Texture>): THREE.ShaderMaterial {
    const cacheKey = graph.id;
    if (this.shaderCache.has(cacheKey)) return this.shaderCache.get(cacheKey)!;

    const uniforms: Record<string, any> = {
      time: { value: 0 },
      baseColor: { value: new THREE.Color('#ffffff') },
      emissiveColor: { value: new THREE.Color('#000000') },
      metallic: { value: 0.0 },
      roughness: { value: 0.5 },
    };

    textures.forEach((tex, id) => { uniforms[`tex_${id}`] = { value: tex }; });

    const vertShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vec4 mvPosition = viewMatrix * worldPos;
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const nodeResults = new Map<string, string>();
    const buildNodeCode = (node: ShaderNode): string => {
      if (nodeResults.has(node.id)) return nodeResults.get(node.id)!;
      let code = '';
      const getInput = (socket: string): string => {
        const edge = graph.edges.find(e => e.to === node.id && e.toSocket === socket);
        if (!edge) return node.inputs[socket] || '';
        const srcNode = graph.nodes.find(n => n.id === edge.from);
        if (!srcNode) return '';
        return buildNodeCode(srcNode);
      };

      switch (node.type) {
        case 'input': code = 'baseColor'; break;
        case 'output': code = ''; break;
        case 'float': code = `${node.value || 0}`; break;
        case 'color': code = `vec3(${new THREE.Color(node.value || '#ffffff').toArray().join(',')})`; break;
        case 'texture':
          const tex = node.textureId ? `tex_${node.textureId}` : 'white';
          code = `texture2D(${tex}, vUv).rgb`;
          break;
        case 'add': code = `(${getInput('a')} + ${getInput('b')})`; break;
        case 'multiply': code = `(${getInput('a')} * ${getInput('b')})`; break;
        case 'divide': code = `(${getInput('a')} / max(${getInput('b')}, 0.001))`; break;
        case 'subtract': code = `(${getInput('a')} - ${getInput('b')})`; break;
        case 'power': code = `pow(${getInput('base')}, ${node.value || 1.0})`; break;
        case 'sqrt': code = `sqrt(max(${getInput('value')}, 0.0))`; break;
        case 'sin': code = `sin(${getInput('value')})`; break;
        case 'cos': code = `cos(${getInput('value')})`; break;
        case 'mix': code = `mix(${getInput('a')}, ${getInput('b')}, ${node.value || 0.5})`; break;
        case 'clamp': code = `clamp(${getInput('value')}, ${getInput('min') || '0.0'}, ${getInput('max') || '1.0'})`; break;
        case 'normalize': code = `normalize(${getInput('value')})`; break;
        case 'dot': code = `dot(${getInput('a')}, ${getInput('b')})`; break;
        case 'cross': code = `cross(${getInput('a')}, ${getInput('b')})`; break;
        case 'reflect': code = `reflect(normalize(${getInput('incident')}), normalize(${getInput('normal')}))`; break;
        case 'fresnel':
          const fresnelExp = node.value || 0.5;
          code = `pow(1.0 - max(dot(normalize(vNormal), normalize(${getInput('viewDir') || 'vViewPosition'})), 0.0), ${fresnelExp})`;
          break;
        case 'uv': code = 'vUv'; break;
        case 'time': code = 'time'; break;
        case 'position': code = 'vPosition'; break;
        case 'normal': code = 'vNormal'; break;
        case 'viewDir': code = 'normalize(vViewPosition)'; break;
        case 'noise':
          const scale = node.value || 10;
          code = `fract(sin(dot(vUv * ${scale}, vec2(12.9898, 78.233))) * 43758.5453)`;
          break;
        case 'rgb2hsv':
          code = `vec3(0.5)`;
          break;
        case 'hsv2rgb':
          code = `vec3(1.0)`;
          break;
        default: code = 'vec3(1.0)';
      }
      nodeResults.set(node.id, code);
      return code;
    };

    const outputNode = graph.nodes.find(n => n.type === 'output');
    const fragShader = `
      uniform float time;
      uniform vec3 baseColor;
      uniform vec3 emissiveColor;
      uniform float metallic;
      uniform float roughness;
      
      ${[...textures.entries()].map(([id, _]) => `uniform sampler2D tex_${id};`).join('\n')}
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;
      
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        
        ${outputNode ? this.buildPBRCode(outputNode, graph) : 'vec3 albedo = baseColor; float metal = metallic; float rough = roughness; vec3 emissive = emissiveColor;'}
        
        // Simple PBR
        vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
        vec3 halfDir = normalize(lightDir + viewDir);
        float NdotL = max(dot(normal, lightDir), 0.0);
        float NdotH = max(dot(normal, halfDir), 0.0);
        
        vec3 F0 = mix(vec3(0.04), albedo, metal);
        vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(halfDir, viewDir), 0.0), 5.0);
        
        float alpha = rough * rough;
        float alpha2 = alpha * alpha;
        float denom = (NdotH * NdotH * (alpha2 - 1.0) + 1.0);
        float D = alpha2 / (3.14159 * denom * denom);
        
        float k = (rough + 1.0) * (rough + 1.0) / 8.0;
        float G1L = NdotL / (NdotL * (1.0 - k) + k);
        float G1V = NdotV = NdotL / (NdotL * (1.0 - k) + k);
        float G = G1L * G1V;
        
        vec3 specular = (D * G * F) / (4.0 * NdotL * NdotV + 0.001);
        vec3 kD = (1.0 - F) * (1.0 - metal);
        vec3 diffuse = kD * albedo / 3.14159;
        
        vec3 color = (diffuse + specular) * NdotL + emissive;
        
        // Tone mapping
        color = color / (color + vec3(1.0));
        color = pow(color, vec3(1.0/2.2));
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertShader,
      fragmentShader: fragShader,
      side: THREE.DoubleSide,
    });

    this.shaderCache.set(cacheKey, material);
    return material;
  }

  private buildPBRCode(outputNode: ShaderGraph['nodes'][0], graph: ShaderGraph): string {
    const getValue = (socket: string): string => {
      const edge = graph.edges.find(e => e.to === outputNode.id && e.toSocket === socket);
      if (!edge) {
        switch (socket) {
          case 'baseColor': return 'baseColor';
          case 'metallic': return 'metallic';
          case 'roughness': return 'roughness';
          case 'emissive': return 'emissiveColor';
          default: return 'vec3(0.0)';
        }
      }
      const src = graph.nodes.find(n => n.id === edge.from);
      return src ? `node_${src.id}` : 'vec3(0.0)';
    };
    return `
      vec3 albedo = ${getValue('baseColor')};
      float metal = ${getValue('metallic')};
      float rough = ${getValue('roughness')};
      vec3 emissive = ${getValue('emissive')};
    `;
  }

  updateUniforms(graphId: string, time: number) {
    const mat = this.shaderCache.get(graphId);
    if (mat) mat.uniforms.time.value = time;
  }

  createDefaultGraph(): ShaderGraph {
    const inputId = 'input_1';
    const outputId = 'output_1';
    return {
      id: `shader_${Date.now()}`,
      name: 'New Shader',
      nodes: [
        { id: inputId, type: 'input', x: 50, y: 50, inputs: {}, outputs: ['out'], label: 'Base Color' },
        { id: 'float_1', type: 'float', x: 50, y: 180, inputs: {}, outputs: ['value'], value: 0.5, label: 'Metallic' },
        { id: 'float_2', type: 'float', x: 50, y: 280, inputs: {}, outputs: ['value'], value: 0.5, label: 'Roughness' },
        { id: outputId, type: 'output', x: 350, y: 100, inputs: { baseColor: inputId, metallic: 'float_1', roughness: 'float_2' }, outputs: [], label: 'Output' },
      ],
      edges: [
        { from: inputId, fromSocket: 'out', to: outputId, toSocket: 'baseColor' },
        { from: 'float_1', fromSocket: 'value', to: outputId, toSocket: 'metallic' },
        { from: 'float_2', fromSocket: 'value', to: outputId, toSocket: 'roughness' },
      ],
    };
  }

  deleteShader(graphId: string) {
    const mat = this.shaderCache.get(graphId);
    if (mat) {
      mat.dispose();
      this.shaderCache.delete(graphId);
    }
  }

  getShaderMaterial(graphId: string): THREE.ShaderMaterial | undefined {
    return this.shaderCache.get(graphId);
  }
}

export const shaderSystem = new ShaderSystem();

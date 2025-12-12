import React from 'react';
import * as THREE from 'three';

// --- Shared PBR Materials ---

export const goldMaterial = new THREE.MeshStandardMaterial({
  color: "#FFD700",
  metalness: 1.0,
  roughness: 0.15,
  emissive: "#aa8800",
  emissiveIntensity: 0.2,
  envMapIntensity: 2.0
});

export const roseGoldMaterial = new THREE.MeshStandardMaterial({
  color: "#e0bfb8", // Soft Rose Gold
  metalness: 0.9,
  roughness: 0.2,
  emissive: "#5c2e2e",
  emissiveIntensity: 0.1,
  envMapIntensity: 1.5
});

export const redVelvetMaterial = new THREE.MeshStandardMaterial({
  color: "#720e1e", // Deep Burgundy/Wine Red to complement pink
  roughness: 0.9,
  metalness: 0.1,
  emissive: "#2b0005",
  emissiveIntensity: 0.1
});

export const emeraldGlassMaterial = new THREE.MeshPhysicalMaterial({
  color: "#004225",
  metalness: 0.1,
  roughness: 0.05,
  transmission: 0.6,
  thickness: 1.0,
  ior: 1.5,
  emissive: "#001a0a",
  emissiveIntensity: 0.2
});

// --- Custom Shaders ---

export const FoliageShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColorBase: { value: new THREE.Color("#012b15") }, // Deep Emerald
    uColorHighlight: { value: new THREE.Color("#00ff66") },
    uColorGold: { value: new THREE.Color("#FFD700") },
    uSize: { value: 4.0 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uSize;
    attribute float aScale;
    attribute float aSparkleOffset;
    varying float vSparkle;
    varying vec3 vPosition;

    void main() {
      vPosition = position;
      vSparkle = sin(uTime * 2.0 + aSparkleOffset * 10.0);
      
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = uSize * aScale * (30.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColorBase;
    uniform vec3 uColorHighlight;
    uniform vec3 uColorGold;
    varying float vSparkle;
    varying vec3 vPosition;

    void main() {
      // Circular particle
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      if (dist > 0.5) discard;

      // Gradient from center (gold/light) to edge (emerald)
      float strength = 1.0 - (dist * 2.0);
      strength = pow(strength, 1.5);

      vec3 finalColor = mix(uColorBase, uColorHighlight, strength * 0.5);
      
      // Add Gold Sparkles
      if (vSparkle > 0.8) {
        finalColor = mix(finalColor, uColorGold, strength * 2.0);
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};
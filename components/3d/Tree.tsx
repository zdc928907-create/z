import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Center } from '@react-three/drei';
import * as THREE from 'three';
import { FoliageShaderMaterial, goldMaterial, redVelvetMaterial, emeraldGlassMaterial, roseGoldMaterial } from './Materials';
import { GameState } from '../../types';

// --- Configuration ---
const TREE_HEIGHT = 16;
const TREE_RADIUS_BASE = 6;
const FOLIAGE_COUNT = 12000;
const ORNAMENT_COUNTS = {
  GIFTS: 30,  // Heavy
  BALLS: 180, // Light (Increased slightly to accommodate 3 types)
  LIGHTS: 300 // Feather
};

// --- Math Helpers ---

const randomSpherePoint = (radius: number): THREE.Vector3 => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius; // Cubic root for uniform distribution
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
};

const randomConePoint = (height: number, maxRadius: number, yOffset: number): THREE.Vector3 => {
  const h = Math.random() * height; // Height from tip down
  const r = (h / height) * maxRadius; // Radius at this height
  const angle = Math.random() * Math.PI * 2;
  const rad = Math.sqrt(Math.random()) * r; // Sqrt for uniform disc
  
  const x = rad * Math.cos(angle);
  const z = rad * Math.sin(angle);
  const y = height - h + yOffset; // Invert so widest is at bottom
  return new THREE.Vector3(x, y, z);
};

// --- Sub-Components ---

const FoliageSystem = ({ isFormed }: { isFormed: boolean }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const pointsRef = useRef<THREE.Points>(null);
  
  // Data generation
  const { positions, scales, offsets, targetPositions, chaosPositions } = useMemo(() => {
    const pos = new Float32Array(FOLIAGE_COUNT * 3);
    const scl = new Float32Array(FOLIAGE_COUNT);
    const off = new Float32Array(FOLIAGE_COUNT);
    const tPos = [];
    const cPos = [];

    for (let i = 0; i < FOLIAGE_COUNT; i++) {
      const target = randomConePoint(TREE_HEIGHT, TREE_RADIUS_BASE, -5);
      const chaos = randomSpherePoint(25);
      
      tPos.push(target);
      cPos.push(chaos);

      // Start at chaos
      pos[i * 3] = chaos.x;
      pos[i * 3 + 1] = chaos.y;
      pos[i * 3 + 2] = chaos.z;

      scl[i] = Math.random() * 0.5 + 0.5;
      off[i] = Math.random();
    }
    return { positions: pos, scales: scl, offsets: off, targetPositions: tPos, chaosPositions: cPos };
  }, []);

  useFrame((state, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }

    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      
      // Lerp logic
      // We use a simpler spring-like approach or standard lerp for foliage
      const speed = isFormed ? 2.5 : 1.0;
      
      for (let i = 0; i < FOLIAGE_COUNT; i++) {
        const cx = chaosPositions[i].x;
        const cy = chaosPositions[i].y;
        const cz = chaosPositions[i].z;

        const tx = targetPositions[i].x;
        const ty = targetPositions[i].y;
        const tz = targetPositions[i].z;

        const currentX = posAttr.getX(i);
        const currentY = posAttr.getY(i);
        const currentZ = posAttr.getZ(i);

        // Destination based on state
        const destX = isFormed ? tx : cx;
        const destY = isFormed ? ty : cy;
        const destZ = isFormed ? tz : cz;

        // Apply Lerp
        const lx = THREE.MathUtils.lerp(currentX, destX, speed * delta);
        const ly = THREE.MathUtils.lerp(currentY, destY, speed * delta);
        const lz = THREE.MathUtils.lerp(currentZ, destZ, speed * delta);

        posAttr.setXYZ(i, lx, ly, lz);
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aScale" count={scales.length} array={scales} itemSize={1} />
        <bufferAttribute attach="attributes-aSparkleOffset" count={offsets.length} array={offsets} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial 
        ref={shaderRef} 
        {...FoliageShaderMaterial} 
        transparent 
        depthWrite={false} 
        blending={THREE.AdditiveBlending} 
      />
    </points>
  );
};

const OrnamentSystem = ({ 
  count, 
  geometry, 
  material, 
  weight = 1.0, 
  scale = 1.0,
  isFormed 
}: { 
  count: number, 
  geometry: THREE.BufferGeometry, 
  material: THREE.Material, 
  weight?: number, 
  scale?: number,
  isFormed: boolean 
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Data
  const { chaos, targets, rotations } = useMemo(() => {
    const c = [], t = [], r = [];
    for (let i = 0; i < count; i++) {
      c.push(randomSpherePoint(30));
      // Bias ornaments to outer edge of cone
      const coneP = randomConePoint(TREE_HEIGHT, TREE_RADIUS_BASE * 1.1, -5);
      t.push(coneP);
      r.push(new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI));
    }
    return { chaos: c, targets: t, rotations: r };
  }, [count]);

  // Current positions state (to avoid reading from matrix every frame which is slow, we simulate physics variables)
  const currentPositions = useMemo(() => {
    return chaos.map(p => p.clone());
  }, [chaos]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Weight affects lerp speed. Heavier = slower.
    // Base speed adjusted by weight.
    const baseSpeed = 2.0;
    const factor = THREE.MathUtils.clamp(baseSpeed / weight, 0.1, 5.0);
    
    // Add a slight floating wobble based on time
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const target = isFormed ? targets[i] : chaos[i];
      const current = currentPositions[i];

      // Lerp position
      current.lerp(target, factor * delta);

      dummy.position.copy(current);
      
      // Add wobble when formed
      if (isFormed) {
        dummy.position.y += Math.sin(time + i) * 0.005;
      }
      
      dummy.rotation.copy(rotations[i]);
      // Rotate slowly
      dummy.rotation.x += 0.2 * delta;
      dummy.rotation.y += 0.5 * delta;

      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} castShadow receiveShadow />
  );
};

// --- Star Topper Component ---

const StarTopper = ({ isFormed }: { isFormed: boolean }) => {
  const starRef = useRef<THREE.Group>(null);

  // Define Star Shape
  const { shape, extrudeSettings } = useMemo(() => {
    const s = new THREE.Shape();
    const points = 5;
    const outerRadius = 0.8;
    const innerRadius = 0.4;
    const step = Math.PI / points;
    
    s.moveTo(0, outerRadius);
    for (let i = 0; i < 2 * points + 1; i++) {
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        const a = i * step;
        s.lineTo(Math.sin(a) * r, Math.cos(a) * r);
    }

    const settings = {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 2
    };

    return { shape: s, extrudeSettings: settings };
  }, []);

  useFrame((state, delta) => {
    if (starRef.current && isFormed) {
      starRef.current.rotation.y += delta * 0.5;
      // Gentle floating
      starRef.current.position.y = (TREE_HEIGHT - 4.2) + Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group ref={starRef} position={[0, TREE_HEIGHT - 4.2, 0]} scale={isFormed ? 1 : 0} visible={isFormed}>
      <Center>
        <mesh>
          <extrudeGeometry args={[shape, extrudeSettings]} />
          <meshStandardMaterial 
            color="#FFD700" 
            emissive="#FFD700" 
            emissiveIntensity={4.0} 
            roughness={0.1}
            metalness={1.0}
          />
        </mesh>
      </Center>
      {/* Add a point light to the star to make it glow onto the tree */}
      <pointLight intensity={10} color="#FFD700" distance={10} decay={2} />
    </group>
  );
};

// --- Main Tree Component ---

interface TreeProps {
  gameState: GameState;
}

export const LuxuryTree: React.FC<TreeProps> = ({ gameState }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Define when the tree is "Formed"
  const isFormed = gameState !== GameState.INTRO;

  // Rotation of the whole group
  useFrame((state) => {
    if (groupRef.current && isFormed) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  // Geometries
  const boxGeo = useMemo(() => new THREE.BoxGeometry(0.6, 0.6, 0.6), []);
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(0.3, 32, 32), []);
  const lightGeo = useMemo(() => new THREE.SphereGeometry(0.1, 16, 16), []);

  const ballsPerType = Math.floor(ORNAMENT_COUNTS.BALLS / 3);

  return (
    <group ref={groupRef}>
      {/* 1. The Needles (Shader Particles) */}
      <FoliageSystem isFormed={isFormed} />

      {/* 2. Heavy Ornaments: Gifts (Burgundy Velvet) */}
      <OrnamentSystem 
        count={ORNAMENT_COUNTS.GIFTS} 
        geometry={boxGeo} 
        material={redVelvetMaterial} 
        weight={2.5} 
        scale={1.0}
        isFormed={isFormed} 
      />
      
      {/* 3. Medium Ornaments: Gold, Emerald & Rose Gold Balls */}
      <OrnamentSystem 
        count={ballsPerType} 
        geometry={sphereGeo} 
        material={goldMaterial} 
        weight={1.0} 
        isFormed={isFormed} 
      />
      <OrnamentSystem 
        count={ballsPerType} 
        geometry={sphereGeo} 
        material={emeraldGlassMaterial} 
        weight={1.2} 
        isFormed={isFormed} 
      />
      <OrnamentSystem 
        count={ballsPerType} 
        geometry={sphereGeo} 
        material={roseGoldMaterial} 
        weight={1.1} 
        isFormed={isFormed} 
      />

      {/* 4. Light Ornaments: Glowing Lights */}
      <OrnamentSystem 
        count={ORNAMENT_COUNTS.LIGHTS} 
        geometry={lightGeo} 
        material={new THREE.MeshBasicMaterial({ color: "#fffeb0" })} 
        weight={0.2} // Very fast/light
        isFormed={isFormed} 
      />

      {/* 5. The Topper - Star */}
      <StarTopper isFormed={isFormed} />
    </group>
  );
};

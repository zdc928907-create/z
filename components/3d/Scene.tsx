import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, ToneMapping } from '@react-three/postprocessing';
import { LuxuryTree } from './Tree';
import { GameState } from '../../types';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';

interface SceneProps {
  gameState: GameState;
  handRotation?: { x: number, y: number };
}

export const Scene: React.FC<SceneProps> = ({ gameState, handRotation = { x: 0, y: 0 } }) => {
  const controlsRef = useRef<any>(null);

  useFrame((state, delta) => {
    // Smoothly interpolate camera position based on hand rotation
    if (controlsRef.current) {
      const controls = controlsRef.current;
      
      // Target angles based on hand position
      // X maps to Azimuth (Left/Right)
      // Y maps to Polar (Up/Down)
      
      // We add the hand offset to a base rotation
      // Let's assume handRotation x goes from -1 to 1. 
      // We want to shift the angle by maybe +/- 45 degrees (PI/4)
      
      const targetAzimuth = handRotation.x * (Math.PI / 3);
      const targetPolar = Math.PI / 2 - (handRotation.y * (Math.PI / 6)); // Center at 90 deg, move +/- 30 deg

      // Since OrbitControls manages the angles, we can try to lerp the current azimuth towards target
      // BUT OrbitControls is also auto-rotating or user-controlled.
      // Strategy: If hand is active (not 0,0 roughly), we bias the controls.
      // A cleaner way for "View Control" is to update the camera position directly or use controls.setAzimuthalAngle
      
      // Let's just gently nudge the auto-rotation or current angle
      const currentAzimuth = controls.getAzimuthalAngle();
      const currentPolar = controls.getPolarAngle();
      
      // Soft lerp
      const damp = 2.0 * delta;
      
      // If there's significant hand input, we override auto-rotate effect visually
      if (Math.abs(handRotation.x) > 0.05 || Math.abs(handRotation.y) > 0.05) {
         // This is a bit hacky with OrbitControls, but effective for "Looking around"
         controls.setAzimuthalAngle(THREE.MathUtils.lerp(currentAzimuth, targetAzimuth, damp));
         controls.setPolarAngle(THREE.MathUtils.lerp(currentPolar, targetPolar, damp));
      }
      
      controls.update();
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 4, 20]} fov={50} />
      <OrbitControls 
        ref={controlsRef}
        enablePan={false} 
        enableZoom={true} 
        minDistance={10}
        maxDistance={30}
        minPolarAngle={Math.PI / 3} 
        maxPolarAngle={Math.PI / 1.5}
        rotateSpeed={0.5}
        // Disable auto rotate if we are controlling with hand significantly, or just keep it subtle
        autoRotate={gameState !== GameState.INTRO && Math.abs(handRotation.x) < 0.1}
        autoRotateSpeed={0.5}
      />

      {/* Cinematic Lighting Setup */}
      <ambientLight intensity={0.1} color="#001a0a" />
      
      {/* Key Light (Warm Gold) */}
      <spotLight 
        position={[15, 20, 15]} 
        angle={0.25} 
        penumbra={1} 
        intensity={300} 
        color="#FFD700" 
        castShadow 
        shadow-bias={-0.0001}
      />
      
      {/* Fill Light (Cool Emerald) */}
      <spotLight 
        position={[-15, 10, -15]} 
        angle={0.4} 
        penumbra={1} 
        intensity={200} 
        color="#006633" 
      />

      {/* Rim Light (Soft Pink for romantic luxury) */}
      <spotLight 
        position={[0, 10, -20]} 
        intensity={180} 
        color="#ffc4d6" 
      />

      {/* Lobby Environment for reflection */}
      <Environment preset="lobby" background={false} blur={0.5} />

      <group position={[0, -5, 0]}>
        <LuxuryTree gameState={gameState} />
        
        {/* Floor Reflections */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial 
            color="#000905" 
            roughness={0.1} 
            metalness={0.8} 
          />
        </mesh>
      </group>

      {/* Post Processing for Cinematic Glow */}
      <EffectComposer disableNormalPass multisampling={0}>
        <Bloom 
          luminanceThreshold={0.8} 
          mipmapBlur 
          intensity={1.2} 
          radius={0.6} 
        />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette eskil={false} offset={0.1} darkness={0.7} />
        <Noise opacity={0.02} />
      </EffectComposer>
    </>
  );
};

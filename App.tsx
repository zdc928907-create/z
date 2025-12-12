import React, { useState, Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Scene } from './components/3d/Scene';
import { Overlay } from './components/UI/Overlay';
import { HandController } from './components/HandController';
import { GameState } from './types';

function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.INTRO);
  const [handRotation, setHandRotation] = useState({ x: 0, y: 0 });

  const handleGesture = useCallback((gesture: 'OPEN' | 'CLOSED' | 'NONE') => {
    // Debounce or direct check could go here, but simple check is okay
    if (gesture === 'OPEN') {
      // Unleash -> Chaos
      setGameState(prev => (prev !== GameState.INTRO ? GameState.INTRO : prev));
    } else if (gesture === 'CLOSED') {
      // Form -> Interactive
      setGameState(prev => {
         if (prev === GameState.INTRO || prev === GameState.FORMING) {
            return GameState.INTERACTIVE;
         }
         return prev;
      });
    }
  }, []);

  const handleHandMove = useCallback((x: number, y: number) => {
     // Smooth dampening could happen here, but we pass raw normalized coords (-1 to 1)
     setHandRotation({ x, y });
  }, []);

  return (
    <div className="w-full h-screen relative bg-[#011a0d]">
      <Canvas shadows dpr={[1, 1.5]} className="z-0" gl={{ antialias: false, stencil: false, depth: true }}>
        <Suspense fallback={null}>
           <Scene gameState={gameState} handRotation={handRotation} />
        </Suspense>
      </Canvas>
      <Loader 
        containerStyles={{ background: '#011a0d' }} 
        innerStyles={{ background: '#002211', width: '200px', height: '2px' }}
        barStyles={{ background: '#FFD700', height: '2px' }}
        dataStyles={{ color: '#FFD700', fontFamily: 'Cinzel', fontSize: '12px' }}
      />
      
      <Overlay gameState={gameState} setGameState={setGameState} />
      <HandController onGesture={handleGesture} onMove={handleHandMove} />
      
      {/* Cinematic vignette overlay via CSS for extra depth */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,10,5,0.4)_80%,rgba(0,0,0,0.8)_100%)] z-1" />
    </div>
  );
}

export default App;

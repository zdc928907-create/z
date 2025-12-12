import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

interface HandControllerProps {
  onGesture: (gesture: 'OPEN' | 'CLOSED' | 'NONE') => void;
  onMove: (x: number, y: number) => void;
}

export const HandController: React.FC<HandControllerProps> = ({ onGesture, onMove }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;

    const setupLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });

      startWebcam();
    };

    const startWebcam = async () => {
      if (!videoRef.current) return;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240 } 
        });
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', predictWebcam);
        setLoaded(true);
      } catch (err) {
        console.error("Webcam error:", err);
      }
    };

    let lastVideoTime = -1;

    const predictWebcam = () => {
      if (!handLandmarker || !videoRef.current) return;

      const startTimeMs = performance.now();
      
      if (videoRef.current.currentTime !== lastVideoTime) {
        lastVideoTime = videoRef.current.currentTime;
        const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          
          // 1. Calculate Hand Center (for movement)
          // Simple average of all points or just use wrist (0) + middle finger mcp (9)
          let centerX = 0;
          let centerY = 0;
          landmarks.forEach(lm => {
            centerX += lm.x;
            centerY += lm.y;
          });
          centerX /= landmarks.length;
          centerY /= landmarks.length;

          // Mirror X for intuitive control (moving hand right moves view right)
          const finalX = (1 - centerX) * 2 - 1; // Map 0..1 to -1..1
          const finalY = centerY * 2 - 1;       // Map 0..1 to -1..1
          
          onMove(finalX, finalY);

          // 2. Gesture Detection (Open vs Closed)
          // Check if fingers are extended. 
          // Tip indices: 8 (Index), 12 (Middle), 16 (Ring), 20 (Pinky)
          // PIP indices: 6, 10, 14, 18
          // Thumb: 4 vs 2
          
          const isFingerExtended = (tipIdx: number, pipIdx: number) => {
             // For non-thumb fingers, extended if tip is higher (lower y value) than PIP 
             // BUT hand rotation matters. 
             // Better metric: Distance from wrist (0). Extended finger tip is further from wrist than PIP.
             const wrist = landmarks[0];
             const tip = landmarks[tipIdx];
             const pip = landmarks[pipIdx];
             
             const distTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
             const distPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
             
             return distTip > distPip;
          };

          const thumbExtended = isFingerExtended(4, 2);
          const indexExtended = isFingerExtended(8, 6);
          const middleExtended = isFingerExtended(12, 10);
          const ringExtended = isFingerExtended(16, 14);
          const pinkyExtended = isFingerExtended(20, 18);

          const extendedCount = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

          if (extendedCount >= 4) {
            onGesture('OPEN');
          } else if (extendedCount <= 1) {
            onGesture('CLOSED');
          } else {
            onGesture('NONE');
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    setupLandmarker();

    return () => {
      cancelAnimationFrame(animationFrameId);
      handLandmarker?.close();
    };
  }, [onGesture, onMove]);

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-opacity duration-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
      <div className="relative rounded-lg overflow-hidden border-2 border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.3)] w-32 h-24 bg-black">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover transform -scale-x-100" // Mirror the preview
        />
        <div className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
      </div>
      <p className="text-[#FFD700] text-[10px] text-center mt-1 font-[Cinzel] tracking-widest uppercase opacity-80">
        Vision Control Active
      </p>
    </div>
  );
};

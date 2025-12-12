import React, { useState, useEffect } from 'react';
import { Sparkles, Send, Star } from 'lucide-react';
import { generateMagicalWish } from '../../services/geminiService';
import { GameState, WishResponse } from '../../types';

interface OverlayProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
}

export const Overlay: React.FC<OverlayProps> = ({ gameState, setGameState }) => {
  const [input, setInput] = useState('');
  const [wishResponse, setWishResponse] = useState<WishResponse | null>(null);
  
  const handleWish = async () => {
    if (!input.trim()) return;
    setGameState(GameState.WISH_PENDING);
    
    // Aesthetic delay for suspense
    const response = await generateMagicalWish(input);
    setWishResponse(response);
    setGameState(GameState.WISH_GRANTED);
    setInput('');
  };

  const handleEnter = () => {
    setGameState(GameState.FORMING);
    setTimeout(() => {
        setGameState(GameState.INTERACTIVE);
    }, 1000);
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8 md:p-12">
      {/* Header */}
      <div className="w-full flex justify-between items-start">
        <div className="pointer-events-auto">
          {/* Updated gradient to include pink/rose */}
          <h1 className="text-4xl md:text-6xl font-[Cinzel] text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#f5a4b7] to-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
            ARIX
          </h1>
          <p className="text-[#e6c2cc] opacity-90 font-[Playfair Display] tracking-[0.2em] text-sm md:text-base mt-2 uppercase">
            Signature Collection
          </p>
        </div>
        
        <div className="text-right hidden md:block">
           <p className="text-[#590d22] font-bold text-sm bg-[#FFD700] px-3 py-1 rounded-full shadow-[0_0_15px_rgba(255,215,0,0.3)]">
             LIVE EXPERIENCE
           </p>
        </div>
      </div>

      {/* Center Interaction Area */}
      <div className="flex-1 flex items-center justify-center pointer-events-auto">
        {gameState === GameState.INTRO && (
           <button 
             onClick={handleEnter}
             className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-full border border-[#FFD700]/30 hover:border-[#FFD700] transition-all duration-700 backdrop-blur-sm"
           >
              <div className="absolute inset-0 w-0 bg-[#FFD700] transition-all duration-[250ms] ease-out group-hover:w-full opacity-10"></div>
              <span className="relative text-[#FFD700] font-[Cinzel] tracking-widest flex items-center gap-2">
                <Sparkles size={16} /> ASSEMBLE THE GRAND TREE
              </span>
           </button>
        )}

        {gameState === GameState.WISH_PENDING && (
          <div className="animate-pulse flex flex-col items-center gap-4">
             <Star className="text-[#FFD700] animate-spin" size={48} />
             <p className="text-[#FFD700] font-[Playfair Display] text-xl italic">consulting the stars...</p>
          </div>
        )}

        {gameState === GameState.WISH_GRANTED && wishResponse && (
           <div className="max-w-md bg-[#011a0d]/90 backdrop-blur-md border border-[#FFD700]/50 p-8 rounded-2xl shadow-[0_0_50px_rgba(255,215,0,0.2)] text-center animate-fade-in-up">
              <Star className="text-[#FFD700] mx-auto mb-4" fill="#FFD700" size={32} />
              <p className="text-[#FFF8DC] font-[Playfair Display] text-2xl italic leading-relaxed mb-6">
                "{wishResponse.message}"
              </p>
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent mb-4"></div>
              <p className="text-[#FFD700]/60 text-xs tracking-widest uppercase">Magic Resonance: {wishResponse.magicalFactor}%</p>
              <button 
                onClick={() => setGameState(GameState.INTERACTIVE)}
                className="mt-6 text-[#FFD700] hover:text-white transition-colors underline decoration-1 underline-offset-4 text-sm font-[Cinzel]"
              >
                Make Another Wish
              </button>
           </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="w-full flex flex-col items-center pointer-events-auto">
        {(gameState === GameState.INTERACTIVE || gameState === GameState.FORMING) && (
          <div className="relative w-full max-w-lg transition-opacity duration-1000" style={{ opacity: gameState === GameState.FORMING ? 0 : 1 }}>
             <input 
               type="text" 
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="Whisper your wish to the tree..."
               onKeyDown={(e) => e.key === 'Enter' && handleWish()}
               className="w-full bg-[#001108]/80 backdrop-blur border border-[#FFD700]/30 rounded-full py-4 px-8 text-[#FFD700] placeholder-[#FFD700]/30 focus:outline-none focus:border-[#FFD700] focus:shadow-[0_0_30px_rgba(255,215,0,0.2)] transition-all font-[Playfair Display]"
             />
             <button 
               onClick={handleWish}
               disabled={!input.trim()}
               className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#FFD700] rounded-full text-[#011a0d] hover:bg-[#ffe55c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Send size={20} />
             </button>
          </div>
        )}
        
        <div className="mt-8 text-[#FFD700]/40 text-xs font-[Cinzel] tracking-[0.3em]">
           EST. 2025 • INTERACTIVE EXPERIENCE
        </div>
      </div>
    </div>
  );
};
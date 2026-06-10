export default function AnimatedLogo() {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center transform scale-75 origin-left ml-2">
      {/* Stars */}
      <div className="absolute -top-2 left-2 animate-[starBounce_2s_ease-in-out_infinite_0s]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fde047" stroke="#ca8a04" strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      </div>
      <div className="absolute -top-6 left-8 animate-[starBounce_2s_ease-in-out_infinite_0.5s]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#fef08a" stroke="#ca8a04" strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      </div>
      <div className="absolute -top-2 right-2 animate-[starBounce_2s_ease-in-out_infinite_1s]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fde047" stroke="#ca8a04" strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      </div>

      {/* Lever */}
      <div className="absolute -left-3 top-2 w-8 h-16 z-0">
         {/* Lever Arm */}
         <div className="absolute bottom-4 left-3 w-2 h-14 bg-gray-600 rounded-full origin-bottom animate-[pullLever_3s_ease-in-out_infinite]">
            {/* Lever Ball */}
            <div className="absolute -top-3 -left-2 w-6 h-6 bg-red-500 rounded-full shadow-inner border border-red-700"></div>
         </div>
         {/* Lever Base */}
         <div className="absolute bottom-1 left-1 w-4 h-8 bg-gradient-to-r from-green-400 to-green-600 rounded-l-md border-y-2 border-l-2 border-green-700 shadow-md"></div>
      </div>

      {/* Slot Machine Body */}
      <div className="relative z-10 w-24 h-16 bg-[#fde047] rounded-lg border-2 border-[#ca8a04] shadow-[0_5px_10px_rgba(0,0,0,0.5)] flex items-center justify-center p-1">
         {/* Screen */}
         <div className="w-full h-full bg-red-600 rounded flex overflow-hidden shadow-inner border border-red-800">
            {/* Reel 1 */}
            <div className="flex-1 border-r border-red-800/50 bg-gradient-to-b from-red-700 via-red-500 to-red-700 flex items-center justify-center relative overflow-hidden">
               <div className="absolute flex flex-col animate-[spinReel_1s_linear_infinite]">
                  <span className="text-white font-black text-2xl drop-shadow-md py-1">7</span>
                  <span className="text-white font-black text-2xl drop-shadow-md py-1">⭐</span>
                  <span className="text-white font-black text-2xl drop-shadow-md py-1">🍒</span>
                  <span className="text-white font-black text-2xl drop-shadow-md py-1">7</span>
               </div>
            </div>
            {/* Reel 2 */}
            <div className="flex-1 border-r border-red-800/50 bg-gradient-to-b from-red-700 via-red-500 to-red-700 flex items-center justify-center relative overflow-hidden">
               <div className="absolute flex flex-col animate-[spinReel_1.2s_linear_infinite_0.1s]">
                  <span className="text-white font-black text-2xl drop-shadow-md py-1">7</span>
                  <span className="text-white font-black text-2xl drop-shadow-md py-1">🔔</span>
                  <span className="text-white font-black text-2xl drop-shadow-md py-1">🍋</span>
                  <span className="text-white font-black text-2xl drop-shadow-md py-1">7</span>
               </div>
            </div>
            {/* Reel 3 */}
            <div className="flex-1 bg-gradient-to-b from-red-700 via-red-500 to-red-700 flex items-center justify-center relative overflow-hidden">
               <div className="absolute flex flex-col animate-[spinReel_1.4s_linear_infinite_0.2s]">
                  <span className="text-white font-black text-2xl drop-shadow-md py-1">7</span>
                  <span className="text-white font-black text-2xl drop-shadow-md py-1">🍉</span>
                  <span className="text-white font-black text-2xl drop-shadow-md py-1">💎</span>
                  <span className="text-white font-black text-2xl drop-shadow-md py-1">7</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

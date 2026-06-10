import { FaFire, FaLeaf, FaGem, FaStar } from "react-icons/fa";
import { GiTribalMask, GiCrystalBall, GiEvilEyes, GiBanana } from "react-icons/gi";

export default function SlotMachine() {
  return (
             <div className="relative w-full h-[90%] flex flex-col items-center justify-end pb-8 z-10">
                {/* Frame - Stone/Wood Structure */}
                <div className="relative w-full h-full max-w-4xl flex flex-col items-center">
                   
                   {/* Top Arch */}
                   <div className="w-[105%] h-24 bg-[#c88d51] border-b-8 border-[#9e6730] rounded-t-lg z-20 flex items-center justify-center relative shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                      {/* Voodoo Rush Logo */}
                      <div className="bg-[#9e3a24] px-10 py-3 rounded-full border-4 border-[#ffb347] shadow-[0_5px_15px_rgba(0,0,0,0.5)] flex items-center justify-center transform -translate-y-4">
                         <span className="text-4xl font-black text-[#ffedcc] drop-shadow-[0_2px_2px_rgba(0,0,0,1)] uppercase tracking-tighter" style={{ WebkitTextStroke: '1px #4a1c11' }}>VOODOO <br/> RUSH</span>
                      </div>
                      <FaLeaf className="absolute top-2 left-1/2 text-green-500 text-3xl transform -translate-x-1/2 -translate-y-8 drop-shadow-md" />
                   </div>

                   {/* Pillars & Board */}
                   <div className="relative w-full flex-1 flex items-stretch px-4">
                      
                      {/* Left Pillar (Tiki) */}
                      <div className="w-24 h-full relative z-20 -mr-4 flex flex-col justify-between">
                         <div className="flex-1 bg-[#47858c] border-x-4 border-[#2c585e] shadow-[inset_10px_0_20px_rgba(0,0,0,0.5)] flex flex-col items-center py-4">
                            <GiTribalMask className="text-[#f97316] text-6xl drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)] mb-2" />
                            <div className="w-16 h-4 bg-[#2c585e] my-2"></div>
                            <GiTribalMask className="text-[#eab308] text-6xl drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]" />
                         </div>
                         {/* Torch */}
                         <div className="absolute -left-6 bottom-10 w-12 h-32 flex flex-col items-center">
                            <FaFire className="text-orange-500 text-4xl animate-pulse drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
                            <div className="w-4 h-20 bg-[#6b4226] border-2 border-[#4a2e1b] rounded-b-full"></div>
                         </div>
                      </div>

                      {/* Main Reel Board */}
                      <div className="flex-1 bg-[#1a1130] border-8 border-[#eab308] shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] p-2 grid grid-cols-5 gap-2 relative z-10">
                         {/* Grid Lines */}
                         <div className="absolute inset-0 grid grid-cols-5 pointer-events-none">
                            <div className="border-r border-white/5 h-full"></div>
                            <div className="border-r border-white/5 h-full"></div>
                            <div className="border-r border-white/5 h-full"></div>
                            <div className="border-r border-white/5 h-full"></div>
                         </div>

                         {[
                           [{sym: <GiCrystalBall/>, color: 'text-purple-500'}, {sym: <GiCrystalBall/>, color: 'text-blue-500'}, {sym: <GiEvilEyes/>, color: 'text-yellow-500'}],
                           [{sym: <FaGem/>, color: 'text-orange-500'}, {sym: <FaLeaf/>, color: 'text-pink-500'}, {sym: <GiTribalMask/>, text: 'WILD', type: 'special', color: 'text-orange-500'}],
                           [{sym: <GiCrystalBall/>, color: 'text-red-500'}, {sym: <GiTribalMask/>, color: 'text-orange-500'}, {sym: <GiTribalMask/>, text: 'BONUS', type: 'special', color: 'text-purple-500'}],
                           [{sym: <FaGem/>, color: 'text-green-500'}, {sym: <GiBanana/>, color: 'text-yellow-400'}, {sym: <GiCrystalBall/>, color: 'text-blue-500'}],
                           [{sym: <GiTribalMask/>, color: 'text-yellow-500'}, {sym: <FaGem/>, color: 'text-purple-500'}, {sym: <GiTribalMask/>, color: 'text-orange-500'}]
                         ].map((col, i) => (
                           <div key={i} className="flex flex-col items-center justify-around h-full">
                               {col.map((item: any, j: number) => {
                                  const isSpecial = item.type === 'special';
                                  return (
                                   <div key={j} className={`h-1/3 w-full flex items-center justify-center relative ${isSpecial ? 'border-2 border-orange-500 shadow-[inset_0_0_20px_rgba(249,115,22,0.3)] bg-orange-900/20' : ''}`}>
                                     <div className={`text-5xl filter drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] ${item.color}`}>
                                       {item.sym}
                                     </div>
                                     {isSpecial && (
                                        <span className="absolute bottom-1 inset-x-0 text-center text-[10px] font-black text-yellow-400 drop-shadow-[0_2px_2px_black] uppercase tracking-widest">{item.text}</span>
                                     )}
                                   </div>
                                  )
                               })}
                           </div>
                         ))}

                         <div className="absolute left-0 top-[60%] w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-80 shadow-[0_0_10px_rgba(250,204,21,1)]"></div>
                      </div>

                      {/* Right Pillar (Tiki) */}
                      <div className="w-24 h-full relative z-20 -ml-4 flex flex-col justify-between">
                         <div className="flex-1 bg-[#47858c] border-x-4 border-[#2c585e] shadow-[inset_-10px_0_20px_rgba(0,0,0,0.5)] flex flex-col items-center py-4">
                            <GiTribalMask className="text-[#f97316] text-6xl drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)] mb-2" />
                            <div className="w-16 h-4 bg-[#2c585e] my-2"></div>
                            <GiTribalMask className="text-[#eab308] text-6xl drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]" />
                         </div>
                         {/* Torch */}
                         <div className="absolute -right-6 bottom-10 w-12 h-32 flex flex-col items-center">
                            <FaFire className="text-orange-500 text-4xl animate-pulse drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
                            <div className="w-4 h-20 bg-[#6b4226] border-2 border-[#4a2e1b] rounded-b-full"></div>
                         </div>
                      </div>

                   </div>

                   {/* Bottom Base */}
                   <div className="w-[105%] h-12 bg-[#c88d51] border-t-8 border-[#9e6730] rounded-b-lg z-20 flex items-center justify-center relative shadow-[0_10px_20px_rgba(0,0,0,0.6)]"></div>
                </div>

                {/* Legend Panel on Left (Floating) */}
                <div className="absolute top-1/4 -left-16 w-32 bg-[#1f1513] border-4 border-[#eab308] rounded-lg p-2 shadow-2xl z-30">
                   <div className="flex items-center justify-between text-xs mb-1"><span className="text-yellow-500">5 <FaStar className="inline text-[8px]"/></span><span className="font-mono text-white">$225.00</span></div>
                   <div className="flex items-center justify-between text-xs mb-1"><span className="text-orange-500">1 <FaStar className="inline text-[8px]"/></span><span className="font-mono text-white">$1555.00</span></div>
                   <div className="flex items-center justify-between text-xs mb-1"><span className="text-blue-500">3 <FaStar className="inline text-[8px]"/></span><span className="font-mono text-white">$125.00</span></div>
                   <div className="flex items-center justify-between text-xs mb-1"><span className="text-purple-500">2 <FaStar className="inline text-[8px]"/></span><span className="font-mono text-white">$15.00</span></div>
                   <div className="flex items-center justify-between text-xs mb-1"><span className="text-red-500">5 <FaStar className="inline text-[8px]"/></span><span className="font-mono text-white">$210.00</span></div>
                </div>

             </div>
  )
}

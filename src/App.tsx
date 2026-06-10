import { useState, useEffect } from "react";
import { 
  Zap, CircleDashed, Star, Building2, 
  Crown, BarChart2, ChevronLeft, ChevronRight, FileText,
  HelpCircle
} from "lucide-react";
import Confetti from "react-confetti";
import { 
  FaStar, FaBell, FaCommentDots, 
  FaGhost, FaSkull, FaHatWizard, FaLeaf, FaTrophy, FaFire, FaPaintBrush
} from "react-icons/fa";
import { GiTribalMask, GiEvilEyes } from "react-icons/gi";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "./supabase";
import AnimatedLogo from "./AnimatedLogo";
import SlotMachine from "./components/SlotMachine";
import MimicaDashboard from "./components/mimica/MimicaDashboard";
import DibujoDashboard from "./components/dibujo/DibujoDashboard";
import { QUESTION_CATEGORIES, Question } from "./data/questions";
import "./App.css";



type GameState = 'CATEGORIES' | 'QR' | 'PLAYING' | 'FINISHED';

function App() {
  const [balance] = useState(1022.00);
  const [activeTab, setActiveTab] = useState('PREGUNTAS');
  
  // Trivia State
  const [gameState, setGameState] = useState<GameState>('CATEGORIES');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPin, setSessionPin] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (activeTab !== 'PREGUNTAS') {
       setSessionId(null);
       setSessionPin(null);
       setPlayers([]);
       setAnswers([]);
       setGameState('CATEGORIES');
       setTimeLeft(30);
    }
  }, [activeTab]);

  useEffect(() => {
    if (gameState === 'FINISHED') {
       const audio = new Audio('/assets/ganador.mp3');
       audio.play().catch(e => console.log('Audio error:', e));
    }
  }, [gameState]);

  useEffect(() => {
    let timer: any;
    if (gameState === 'PLAYING' && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (gameState === 'PLAYING' && timeLeft === 0) {
      nextQuestion();
    }
    return () => clearTimeout(timer);
  }, [gameState, timeLeft]);

  const handleSelectCategory = async (cat: string) => {
    setSelectedCategory(cat);
    setGameState('QR');
    
    // Generate a short 6-char PIN (e.g. abc-123)
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let pin = '';
    for(let i=0; i<6; i++) pin += chars[Math.floor(Math.random() * chars.length)];
    pin = pin.slice(0,3) + '-' + pin.slice(3);
    
    // Create new session in supabase
    const { data } = await supabase.from('game_sessions').insert([{ status: 'waiting', category: cat, pin }]).select().single();
    if (data) {
      setSessionId(data.id);
      setSessionPin(data.pin);
      
      // Subscribe to players
      const subP = supabase.channel(`players_${data.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_players', filter: `session_id=eq.${data.id}` }, (payload) => {
           setPlayers(prev => {
              if (prev.find(p => p.id === payload.new.id)) return prev;
              return [...prev, payload.new];
           });
        }).subscribe();
        
      // Subscribe to answers
      const subA = supabase.channel(`answers_${data.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_answers', filter: `session_id=eq.${data.id}` }, (payload) => {
           setAnswers(prev => {
              if (prev.find(a => a.id === payload.new.id)) return prev;
              return [...prev, payload.new];
           });
        }).subscribe();

      // We don't cleanup in a simple way to keep the demo working, but ideally we should save the channel refs.
    }
  };

  const startGame = async () => {
    if (!sessionId) return;
    
    // Fetch players safely just in case realtime events were missed
    const { data: currentPlayers } = await supabase.from('game_players').select('*').eq('session_id', sessionId);
    if (currentPlayers) {
      setPlayers(currentPlayers);
    }

    setCurrentQuestionIdx(0);
    setTimeLeft(30);
    setGameState('PLAYING');
    await supabase.from('game_sessions').update({ status: 'playing', current_question: 0 }).eq('id', sessionId);
  };

  const nextQuestion = async () => {
    if (!sessionId || !selectedCategory) return;
    
    // Fetch answers safely directly from DB
    const { data: fetchedAnswers } = await supabase
      .from('game_answers')
      .select('*')
      .eq('session_id', sessionId)
      .eq('question_index', currentQuestionIdx);
      
    const currentAnswers = fetchedAnswers || [];

    // Evaluate current question scores before advancing
    const q = QUESTION_CATEGORIES[selectedCategory][currentQuestionIdx];
    const letterAnswer = ['A','B','C','D'][q.answerIndex];
    
    // Update players' scores locally based on correct answer
    const updatedPlayers = [...players];
    const scoreUpdates: { id: string; score: number }[] = [];
    
    currentAnswers.forEach(ans => {
       if (ans.answer === letterAnswer) {
          const playerIdx = updatedPlayers.findIndex(p => p.id === ans.player_id);
          if (playerIdx > -1) {
             const newScore = updatedPlayers[playerIdx].score + 1000 + (ans.response_time_ms || 0) * 10;
             updatedPlayers[playerIdx] = { ...updatedPlayers[playerIdx], score: newScore };
             scoreUpdates.push({ id: updatedPlayers[playerIdx].id, score: newScore });
          }
       }
    });
    setPlayers(updatedPlayers.sort((a,b) => b.score - a.score));

    setTimeLeft(30);

    // Next question logic
    const nextIdx = currentQuestionIdx + 1;
    if (nextIdx >= QUESTION_CATEGORIES[selectedCategory].length) {
       setGameState('FINISHED');
       await supabase.from('game_sessions').update({ status: 'finished' }).eq('id', sessionId);
    } else {
       setCurrentQuestionIdx(nextIdx);
       await supabase.from('game_sessions').update({ current_question: nextIdx }).eq('id', sessionId);
    }
  };

  const handleExit = () => {
    setGameState('CATEGORIES');
    setSessionId(null);
    setSessionPin(null);
    setPlayers([]);
    setAnswers([]);
  };

  const handleRestart = async () => {
    if (!sessionId) return;
    const resetPlayers = players.map(p => ({ ...p, score: 0 }));
    setPlayers(resetPlayers);
    
    await supabase.from('game_players').update({ score: 0 }).eq('session_id', sessionId);
    await supabase.from('game_answers').delete().eq('session_id', sessionId);
    await supabase.from('game_sessions').update({ status: 'playing', current_question: 0 }).eq('id', sessionId);
    
    setCurrentQuestionIdx(0);
    setTimeLeft(30);
    setGameState('PLAYING');
  };

  const renderPreguntasContent = () => {
     if (gameState === 'CATEGORIES') {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center">
             <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300 drop-shadow-lg mb-8 uppercase tracking-widest">
               Selecciona una Categoría
             </h2>
             <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl px-8">
                {Object.keys(QUESTION_CATEGORIES).map(cat => (
                  <button 
                    key={cat}
                    onClick={() => handleSelectCategory(cat)}
                    className="box-3d-cyan relative group h-32 rounded-2xl flex flex-col items-center justify-center overflow-hidden hover:scale-105 transition-transform"
                  >
                     <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                     <span className="text-2xl font-black text-white drop-shadow-md z-10">{cat}</span>
                     <span className="text-xs text-cyan-200 z-10 font-bold uppercase mt-2">15 Preguntas</span>
                  </button>
                ))}
             </div>
          </div>
        );
     }

     if (gameState === 'QR') {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#191a24]/80 rounded-2xl">
             <h2 className="text-4xl font-black text-white mb-2 uppercase">
               Categoría: <span className="text-orange-400">{selectedCategory}</span>
             </h2>
             <p className="text-gray-400 text-lg mb-8 font-bold">¡Escanea el QR para unirte a la partida!</p>
             
             <div className="bg-white p-4 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.2)] border-4 border-orange-500 mb-8 flex flex-col items-center">
                {sessionId ? (
                   <>
                     <QRCodeSVG value={`https://daniel-uribe-jeugos-navidad-2026.netlify.app/?session_id=${sessionId}`} size={200} level="H" includeMargin={false} />
                     <p className="mt-4 text-xs font-bold text-gray-500 uppercase">O usa este PIN:</p>
                     <p className="text-2xl text-gray-800 font-mono font-black bg-gray-100 px-4 py-2 rounded mt-1 select-all tracking-widest uppercase">{sessionPin}</p>
                   </>
                ) : (
                   <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-500 font-bold">Generando Sesión...</div>
                )}
             </div>

             <button onClick={startGame} className="btn-3d-green px-12 py-4 text-2xl tracking-widest font-black rounded-xl">
               COMENZAR PARTIDA
             </button>
          </div>
        );
     }

     if (gameState === 'PLAYING' && selectedCategory) {
        const q = QUESTION_CATEGORIES[selectedCategory][currentQuestionIdx];
        const colors = [
          { bg: 'bg-red-500', border: 'border-red-700', shape: '▲' },
          { bg: 'bg-blue-500', border: 'border-blue-700', shape: '◆' },
          { bg: 'bg-yellow-500', border: 'border-yellow-700', text: 'text-black', shape: '●' },
          { bg: 'bg-green-500', border: 'border-green-700', shape: '■' }
        ];

        return (
          <div className="w-full h-full flex flex-col p-8">
             <div className="flex justify-between items-center mb-8">
               <div className="flex gap-4">
                  <button onClick={handleExit} className="bg-red-500/20 text-red-500 font-bold px-4 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                    Salir
                  </button>
                  <button onClick={handleRestart} className="bg-blue-500/20 text-blue-500 font-bold px-4 py-2 rounded-xl hover:bg-blue-500 hover:text-white transition-all">
                    Reiniciar
                  </button>
               </div>
               <span className="text-orange-400 font-black text-xl bg-orange-900/30 px-4 py-1 rounded-full uppercase">
                 {selectedCategory}
               </span>
               <div className="flex items-center gap-6">
                 <span className={`text-4xl font-black ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                   ⏳ {timeLeft}s
                 </span>
                 <span className="text-white font-black text-2xl bg-white/10 px-4 py-1 rounded-full">
                   {currentQuestionIdx + 1} / 15
                 </span>
               </div>
             </div>

             <div className="bg-[#20222f] p-8 rounded-2xl border border-white/10 shadow-xl mb-8 flex-1 flex items-center justify-center text-center">
                <h3 className="text-4xl font-black text-white leading-snug">{q.question}</h3>
             </div>

             <div className="grid grid-cols-2 gap-4 h-48">
                {q.options.map((opt, idx) => (
                   <div key={idx} className={`${colors[idx].bg} ${colors[idx].border} border-b-8 rounded-xl flex items-center p-6 shadow-lg relative overflow-hidden`}>
                      <span className={`text-6xl absolute -left-4 opacity-20 ${colors[idx].text || 'text-white'}`}>{colors[idx].shape}</span>
                      <span className={`text-5xl mr-4 drop-shadow-md ${colors[idx].text || 'text-white'}`}>{colors[idx].shape}</span>
                      <span className={`text-3xl font-black ${colors[idx].text || 'text-white'} drop-shadow-md z-10`}>{opt.replace(/^[A-D]\) /, '')}</span>
                   </div>
                ))}
             </div>

             <div className="mt-8 flex justify-center">
                <button onClick={nextQuestion} className="btn-3d-purple px-10 py-4 text-xl tracking-widest font-black rounded-xl">
                  SIGUIENTE PREGUNTA
                </button>
             </div>
          </div>
        );
     }

     if (gameState === 'FINISHED') {
        const winner = players.length > 0 ? players[0] : null;
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
             <Confetti width={window.innerWidth} height={window.innerHeight} recycle={true} numberOfPieces={300} />
             <FaTrophy className="text-8xl text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)] mb-6 animate-bounce" />
             <h2 className="text-4xl lg:text-5xl font-black text-white mb-2 uppercase tracking-widest text-center leading-snug">¡TENEMOS<br/>GANADOR!</h2>
             {winner ? (
                <>
                  <p className="text-4xl font-black text-orange-400 mt-4 uppercase text-center">{winner.name}</p>
                  <p className="text-2xl text-gray-300 mt-2 font-bold">{winner.score} PUNTOS</p>
                </>
             ) : (
                <p className="text-2xl text-gray-400 mt-4">Nadie jugó :(</p>
             )}

             <div className="mt-12 flex gap-4">
               <button onClick={handleExit} className="bg-red-500/20 text-red-500 px-10 py-4 text-xl tracking-widest font-black rounded-xl hover:bg-red-500 hover:text-white transition-all">
                 SALIR AL INICIO
               </button>
               <button onClick={handleRestart} className="btn-3d-green px-10 py-4 text-xl tracking-widest font-black rounded-xl">
                 REINICIAR PARTIDA
               </button>
             </div>
          </div>
        );
     }
  };

  return (
    <div className="flex h-screen w-screen bg-[#111219] font-sans text-white overflow-hidden selection:bg-[#3b82f6] selection:text-white relative">
      
      {/* Background Jungle Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-[#111b2b] to-transparent opacity-80"></div>
        <div className="absolute top-0 left-20 w-4 h-64 bg-green-900/20 rounded-full blur-sm"></div>
        <div className="absolute top-0 right-32 w-6 h-80 bg-green-900/20 rounded-full blur-sm"></div>
      </div>

      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-[#191a24] flex flex-col justify-between border-r border-white/5 z-20 shadow-2xl overflow-y-auto custom-scrollbar">
        <div className="p-4 pt-6">
          <div className="flex items-center justify-center mb-8 cursor-pointer">
            <AnimatedLogo />
          </div>

          <nav className="space-y-1">
            <div onClick={() => setActiveTab('PREGUNTAS')}><SidebarItem icon={<HelpCircle size={18} />} label="PREGUNTAS" active={activeTab === 'PREGUNTAS'} /></div>
            <div onClick={() => setActiveTab('MIMICA')}><SidebarItem icon={<GiTribalMask size={18} />} label="MIMICA" active={activeTab === 'MIMICA'} /></div>
            <div onClick={() => setActiveTab('DIBUJO')}><SidebarItem icon={<FaPaintBrush size={18} />} label="DIBUJO" active={activeTab === 'DIBUJO'} /></div>
            <SidebarItem icon={<div className="w-1 h-4 bg-orange-500 rounded mr-1"></div>} label="LIVE DEALERS" />
            <div onClick={() => setActiveTab('ROULETTE')}><SidebarItem icon={<CircleDashed size={18} />} label="ROULETTE" active={activeTab === 'ROULETTE'} /></div>
            <SidebarItem icon={<Star size={18} />} label="MINES" />
            <SidebarItem icon={<Zap size={18} />} label="CRASH" />
          </nav>

          <div className="mt-6 mx-4 relative rounded-xl overflow-hidden shadow-lg group cursor-pointer border border-[#2a2c3a]">
             <div className="h-28 bg-[#1f1513] flex flex-col items-center justify-center relative">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-30"></div>
               <GiTribalMask className="text-6xl text-orange-500 drop-shadow-md z-10" />
               <div className="absolute bottom-2 inset-x-0 bg-black/60 py-1 text-center backdrop-blur-sm z-10">
                 <span className="text-[10px] font-black uppercase tracking-widest text-orange-300">VOODOO RUSH</span>
               </div>
             </div>
          </div>

          <div className="h-px bg-white/5 my-6 mx-2"></div>

          <nav className="space-y-1">
            <SidebarItem icon={<Crown size={18} />} label="HELP CENTER" />
            <SidebarItem icon={<FileText size={18} />} label="FAQ" />
            <SidebarItem icon={<BarChart2 size={18} />} label="RANK SYSTEM" />
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative z-10">
        
        {/* TOP BAR */}
        <header className="h-16 flex items-center justify-between px-6 bg-[#111219] shadow-md z-30 border-b border-white/5">
          <div className="flex-1"></div>
          <div className="flex items-center gap-4 bg-[#191a24] rounded-full p-1.5 px-2 border border-white/5">
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-yellow-200 text-xs shadow-inner">🪙</div>
                <span className="text-sm font-bold text-white">{balance.toFixed(2)}</span>
             </div>
          </div>
          <div className="flex-1 flex justify-end items-center gap-4">
             <div className="flex items-center gap-3 ml-4 bg-[#191a24] p-1.5 pr-4 rounded-full border border-white/5 cursor-pointer">
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-bold text-white uppercase tracking-wider">NEOMODEON</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-green-900 border border-green-500 flex items-center justify-center text-green-400">
                   <GiEvilEyes size={18} />
                </div>
             </div>
          </div>
        </header>

        {/* GAME AREA */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative z-10 flex flex-col">
          
          {/* MAIN GAME VIEW (Toggles based on Active Tab) */}
          {activeTab === 'PREGUNTAS' || activeTab === 'MIMICA' || activeTab === 'DIBUJO' ? (
          <div className="relative w-full h-full max-w-[95%] mx-auto rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center p-2">
             <div className="absolute inset-0 bg-[#25312a] z-0 rounded-xl overflow-hidden">
                <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-[#111915] to-transparent"></div>
             </div>

             <div className="relative w-full h-full flex flex-col items-center justify-center py-4 z-10 min-h-0">
                {/* Frame - Stone/Wood Structure */}
                <div className="relative w-full h-full max-w-[95%] flex flex-col items-center">
                   
                   {/* Top Arch */}
                   <div className="w-[105%] h-24 bg-[#c88d51] border-b-8 border-[#9e6730] rounded-t-lg z-20 flex items-center justify-center relative shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                      <div className="bg-[#9e3a24] px-10 py-3 rounded-full border-4 border-[#ffb347] shadow-[0_5px_15px_rgba(0,0,0,0.5)] flex items-center justify-center transform -translate-y-4">
                         <span className="text-4xl font-black text-[#ffedcc] drop-shadow-[0_2px_2px_rgba(0,0,0,1)] uppercase tracking-tighter" style={{ WebkitTextStroke: '1px #4a1c11' }}>VOODOO <br/> {activeTab === 'MIMICA' ? 'MIMICA' : activeTab === 'DIBUJO' ? 'DIBUJO' : 'TRIVIA'}</span>
                      </div>
                      <FaLeaf className="absolute top-2 left-1/2 text-green-500 text-3xl transform -translate-x-1/2 -translate-y-8 drop-shadow-md" />
                   </div>

                   {/* Pillars & Board */}
                   <div className="relative w-full flex-1 flex items-stretch px-4 min-h-0">
                      {/* Left Pillar (Tiki) */}
                      <div className="w-24 h-full relative z-20 -mr-4 flex flex-col justify-between">
                         <div className="flex-1 bg-[#47858c] border-x-4 border-[#2c585e] shadow-[inset_10px_0_20px_rgba(0,0,0,0.5)] flex flex-col items-center py-4 gap-2 overflow-hidden">
                            {[...Array(15)].map((_, i) => (
                               <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                                  <GiTribalMask className={`${["text-[#f97316]", "text-[#eab308]", "text-[#ef4444]", "text-[#3b82f6]"][i % 4]} text-6xl drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]`} />
                                  <div className="w-16 h-2 bg-[#2c585e]"></div>
                               </div>
                            ))}
                         </div>
                         {/* Torch */}
                         <div className="absolute -left-6 bottom-10 w-12 h-32 flex flex-col items-center">
                            <FaFire className="text-orange-500 text-4xl animate-pulse drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
                            <div className="w-4 h-20 bg-[#6b4226] border-2 border-[#4a2e1b] rounded-b-full"></div>
                         </div>
                      </div>
                      
                      {/* Screen Board */}
                      <div className="flex-1 bg-[#1a1130] border-8 border-[#eab308] shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] relative z-10 overflow-y-auto custom-scrollbar flex flex-col">
                         {activeTab === 'PREGUNTAS' ? renderPreguntasContent() : activeTab === 'MIMICA' ? <MimicaDashboard /> : <DibujoDashboard />}
                      </div>

                      {/* Right Pillar (Tiki) */}
                      <div className="w-24 h-full relative z-20 -ml-4 flex flex-col justify-between">
                         <div className="flex-1 bg-[#47858c] border-x-4 border-[#2c585e] shadow-[inset_-10px_0_20px_rgba(0,0,0,0.5)] flex flex-col items-center py-4 gap-2 overflow-hidden">
                            {[...Array(15)].map((_, i) => (
                               <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                                  <GiTribalMask className={`${["text-[#f97316]", "text-[#eab308]", "text-[#ef4444]", "text-[#3b82f6]"][i % 4]} text-6xl drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]`} />
                                  <div className="w-16 h-2 bg-[#2c585e]"></div>
                               </div>
                            ))}
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
             </div>
          </div>
          ) : activeTab === 'ROULETTE' ? (
             <SlotMachine />
          ) : (
             <div className="flex-1 flex items-center justify-center text-gray-500">Coming Soon</div>
          )}
        </div>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="w-[320px] bg-[#191a24] flex flex-col border-l border-white/5 z-20 shadow-[-5px_0_15px_rgba(0,0,0,0.5)] p-4 pt-6 overflow-y-auto custom-scrollbar">
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
             <FaTrophy className="text-yellow-500 text-lg" />
             <span className="text-sm font-black text-white uppercase tracking-wider">RANKING EN VIVO</span>
             <span className="bg-green-900/50 text-green-400 text-[10px] font-bold px-1.5 rounded-full">{players.length}</span>
          </div>
          <ChevronRight size={14} className="text-gray-500 cursor-pointer hover:text-white" />
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
          {players.length === 0 ? (
             <div className="text-center text-gray-500 text-xs py-10 font-bold">Esperando jugadores...</div>
          ) : (
             // players are already sorted by score
             players.map((p, idx) => (
               <div key={idx} className={`bg-[#20222f] p-3 rounded-xl border flex items-center gap-3 ${idx === 0 ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-white/5'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black ${idx === 0 ? 'bg-yellow-500' : 'bg-gray-600'}`}>
                     {idx === 0 ? <FaCrown className="text-white"/> : p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 flex flex-col">
                     <span className="text-sm font-black text-white uppercase tracking-wider">{p.name}</span>
                     <span className="text-xs text-orange-400 font-bold">{p.score} Pts</span>
                  </div>
                  {idx === 0 && <FaTrophy className="text-yellow-500" />}
               </div>
             ))
          )}
        </div>
      </aside>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors relative group ${active ? 'text-white bg-[#20222f] rounded-lg' : 'text-gray-500 hover:text-white hover:bg-white/5 rounded-lg'}`}>
      <div className={`w-6 flex justify-center ${active ? 'text-orange-500' : ''}`}>{icon}</div>
      <span className={`text-[10px] font-black tracking-widest ${active ? 'text-white' : ''}`}>{label}</span>
      {label === "ROULETTE" && <FaStar className="absolute right-4 text-orange-500 text-[10px]" />}
    </div>
  );
}

function FaCrown(props: any) {
  return <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M528 288h-46.65l-33.18-132.74a16 16 0 0 0 -19.34-11.66l-105.44 26.36L299.16 34.2a16 16 0 0 0 -30.32 0l-24.22 135.76-105.44-26.36a16 16 0 0 0 -19.34 11.66L86.65 288H48a16 16 0 0 0 0 32h5.5l27.12 144.62A32 32 0 0 0 112 496h352a32 32 0 0 0 31.38-26.12L522.5 320H528a16 16 0 0 0 0-32zM122.92 432L100.41 320h53.18l80.26-118.86-90-88.75 62.46 15.61a16 16 0 0 0 19.34-11.66l19.57-78.27 15.65 88a16 16 0 0 0 20.48 12.87l68.18-17-74.9 83.18H419.6L395.08 432z"></path></svg>;
}

export default App;

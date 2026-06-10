import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../supabase";
import { FaPlay, FaTrophy, FaStopwatch, FaUsers, FaArrowRight, FaPaintBrush } from "react-icons/fa";
import Confetti from "react-confetti";
import { DIBUJO_WORDS } from "../../data/dibujo_words";

const shuffleArray = (array: any[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export default function DibujoDashboard() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [gameState, setGameState] = useState<any>(null);
  const [words, setWords] = useState<string[]>([]);
  const [prepTimeLeft, setPrepTimeLeft] = useState(60);
  const [prepTimeLeft, setPrepTimeLeft] = useState(60);
  const [teamTimes, setTeamTimes] = useState<{ [round: number]: { [team: number]: number } }>({});
  
  const playersRef = useRef<any[]>([]);
  useEffect(() => { playersRef.current = players; }, [players]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const broadcastChannelRef = useRef<any>(null);
  const [recentGuesses, setRecentGuesses] = useState<{name: string, guess: string}[]>([]);

  const domain = "https://daniel-uribe-jeugos-navidad-2026.netlify.app/dibujo";

  useEffect(() => {
    createSession();
  }, []);

  const createSession = async () => {
    const { data, error } = await supabase.from('dibujo_sessions').insert([{ status: 'waiting', current_round: 1 }]).select().single();
    if (data) {
      setSessionId(data.id);
      setSession(data);
      setWords(shuffleArray(DIBUJO_WORDS));
      
      const { data: gsData } = await supabase.from('dibujo_game_state').insert([{ session_id: data.id }]).select().single();
      if (gsData) setGameState(gsData);

      supabase.channel(`dibujo_players_${data.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dibujo_players', filter: `session_id=eq.${data.id}` }, (payload) => {
           setPlayers(prev => [...prev, payload.new]);
        }).subscribe();
        
      supabase.channel(`dibujo_state_${data.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dibujo_game_state', filter: `session_id=eq.${data.id}` }, (payload) => {
           setGameState(payload.new);
        }).subscribe();
        
      // Subscribe to real-time broadcast for canvas drawings and guesses
      const channel = supabase.channel(`dibujo_room_${data.id}`);
      channel.on('broadcast', { event: 'draw' }, (payload) => {
          handleDrawEvent(payload.payload);
      });
      channel.on('broadcast', { event: 'replace_state' }, (payload) => {
          redrawAllStrokes(payload.payload.strokes);
      });
      channel.on('broadcast', { event: 'clear' }, () => {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      });
      channel.on('broadcast', { event: 'guess' }, (payload) => {
          handleGuess(payload.payload);
      });
      channel.subscribe();
      broadcastChannelRef.current = channel;
    }
  };

  const handleDrawEvent = (data: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const { p0, p1, color, size } = data;
      // Convert normalized coordinates back to canvas dimensions
      const w = canvas.width;
      const h = canvas.height;
      
      ctx.beginPath();
      ctx.moveTo(p0.x * w, p0.y * h);
      ctx.lineTo(p1.x * w, p1.y * h);
      ctx.strokeStyle = color;
      ctx.lineWidth = size * Math.min(w, h);
      ctx.lineCap = 'round';
      ctx.stroke();
  };

  const redrawAllStrokes = (strokes: any[]) => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     const ctx = canvas.getContext('2d');
     if (!ctx) return;
     
     const w = canvas.width;
     const h = canvas.height;
     ctx.clearRect(0, 0, w, h);
     
     strokes.forEach(s => {
        if (s.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size * Math.min(w, h);
        ctx.lineCap = 'round';
        
        ctx.moveTo(s.points[0].x * w, s.points[0].y * h);
        for (let i = 1; i < s.points.length; i++) {
           ctx.lineTo(s.points[i].x * w, s.points[i].y * h);
        }
        ctx.stroke();
     });
  };

  // The latest gameState is needed inside handleGuess. We use a ref to bypass closure staleness if needed,
  // but since we only check words[current_word_index], we can just fetch it from DB or rely on state if careful.
  const gameStateRef = useRef<any>(null);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const handleGuess = async (payload: { player_id: string, guess: string }) => {
      const gs = gameStateRef.current;
      if (!gs || !session || session.status !== 'playing') return;

      const player = playersRef.current.find(p => p.id === payload.player_id);
      if (!player) return;

      setRecentGuesses(prev => [{name: player.name, guess: payload.guess}, ...prev].slice(0, 5));

      const currentWord = gs.current_word;
      if (currentWord && payload.guess.trim().toLowerCase() === currentWord.toLowerCase()) {
         // Correct guess!
         await advanceWord(gs);
      }
  };

  const advanceWord = async (currentState: any) => {
     const nextWordIdx = currentState.current_word_index + 1;
     const newWordsCompleted = currentState.words_completed + 1;
     let newTime = currentState.time_elapsed_seconds;

     // Clear canvas locally and tell clients to clear
     const ctx = canvasRef.current?.getContext('2d');
     if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
     broadcastChannelRef.current?.send({ type: 'broadcast', event: 'clear', payload: {} });
     setRecentGuesses([]); // clear recent guesses

     if (newWordsCompleted >= 15) {
        await finishTeamTurn(newTime);
     } else {
        const currentTeamPlayers = playersRef.current.filter(p => p.team_id === session.active_team).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const nextDrawerIdx = currentTeamPlayers.findIndex(p => p.id === currentState.active_drawer_id) + 1;
        const nextDrawerId = currentTeamPlayers[nextDrawerIdx % currentTeamPlayers.length]?.id || null;
        
        await supabase.from('dibujo_game_state').update({
           current_word_index: nextWordIdx,
           words_completed: newWordsCompleted,
           active_drawer_id: nextDrawerId,
           current_word: words[nextWordIdx]
        }).eq('id', currentState.id);
     }
  };

  const finishTeamTurn = async (finalTime: number) => {
     setTeamTimes(prev => {
        const roundTimes = prev[session.current_round] || {};
        return { ...prev, [session.current_round]: { ...roundTimes, [session.active_team]: finalTime } };
     });

     const nextTeam = session.active_team + 1;
     if (nextTeam > 4) {
        await supabase.from('dibujo_sessions').update({ status: 'round_end' }).eq('id', sessionId);
        setSession({ ...session, status: 'round_end' });
     } else {
        startPrepTimer(nextTeam);
     }
  };

  const startGame = async () => {
    startPrepTimer(1);
  };

  const startPrepTimer = async (teamId: number) => {
     setPrepTimeLeft(60);
     await supabase.from('dibujo_sessions').update({ status: 'prep', active_team: teamId }).eq('id', sessionId);
     setSession({ ...session, status: 'prep', active_team: teamId });
  };

  useEffect(() => {
     let timerId: any;
     if (session?.status === 'prep') {
        if (prepTimeLeft > 0) {
           timerId = setTimeout(() => setPrepTimeLeft(prepTimeLeft - 1), 1000);
        } else {
           startPlayingTeam(session.active_team);
        }
     } else if (session?.status === 'playing') {
        timerId = setInterval(() => {
           setGameState((prev: any) => {
              if(!prev) return prev;
              const newTime = prev.time_elapsed_seconds + 1;
              if (newTime % 5 === 0) {
                 supabase.from('dibujo_game_state').update({ time_elapsed_seconds: newTime }).eq('id', prev.id).then();
              }
              return { ...prev, time_elapsed_seconds: newTime };
           });
        }, 1000);
     }
     return () => {
        if (session?.status === 'playing') clearInterval(timerId);
        else clearTimeout(timerId);
     };
  }, [session, prepTimeLeft]);

  const startPlayingTeam = async (teamId: number) => {
     const currentTeamPlayers = playersRef.current.filter(p => p.team_id === teamId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
     const drawer = currentTeamPlayers[0];
     
     const startWordIdx = ((session.current_round - 1) * 60) + ((teamId - 1) * 15);

     await supabase.from('dibujo_game_state').update({
        current_word_index: startWordIdx,
        words_completed: 0,
        time_elapsed_seconds: 0,
        active_drawer_id: drawer?.id || null,
        current_word: words[startWordIdx]
     }).eq('id', gameState.id);

     const { data: newGs } = await supabase.from('dibujo_game_state').select('*').eq('id', gameState.id).single();
     setGameState(newGs);

     await supabase.from('dibujo_sessions').update({ status: 'playing' }).eq('id', sessionId);
     setSession({ ...session, status: 'playing' });
  };

  const nextRound = async () => {
     const newRound = session.current_round + 1;
     if (newRound > 3) {
        await supabase.from('dibujo_sessions').update({ status: 'finished' }).eq('id', sessionId);
        setSession({ ...session, status: 'finished' });
     } else {
        await supabase.from('dibujo_sessions').update({ current_round: newRound }).eq('id', sessionId);
        setSession({ ...session, current_round: newRound });
        startPrepTimer(1);
     }
  };

  const resetGame = async () => {
     setTeamTimes({});
     setWords(shuffleArray(DIBUJO_WORDS));
     setRecentGuesses([]);
     
     const ctx = canvasRef.current?.getContext('2d');
     if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
     broadcastChannelRef.current?.send({ type: 'broadcast', event: 'clear', payload: {} });

     await supabase.from('dibujo_sessions').update({ 
       status: 'waiting', current_round: 1, active_team: null
     }).eq('id', sessionId);
     setSession({ ...session, status: 'waiting', current_round: 1, active_team: null });
  };

  const removePlayer = async (playerId: string) => {
     await supabase.from('dibujo_players').delete().eq('id', playerId);
     setPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  if (!sessionId) return <div className="text-white">Iniciando Servidor...</div>;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center relative min-h-max">

       {session?.status === 'waiting' && (
         <>
           <h2 className="text-4xl font-black text-white mb-2 uppercase flex items-center gap-4"><FaPaintBrush className="text-pink-500"/> DIBUJO EXTREMO</h2>
           <p className="text-gray-400 text-lg mb-8 font-bold">Escanea el QR para unirte a tu equipo.</p>
           
           <div className="grid grid-cols-2 gap-8 mb-8 w-full max-w-4xl">
              {[1, 2, 3, 4].map(team => {
                 const teamPlayers = players.filter(p => p.team_id === team);
                 return (
                 <div key={team} className="bg-white/10 p-6 rounded-xl border border-white/20 flex flex-col items-center">
                    <h3 className="text-2xl font-black text-pink-400 mb-4">Equipo {team}</h3>
                    <div className="bg-white p-2 rounded-lg mb-4">
                       <QRCodeSVG value={`${domain}?session_id=${sessionId}&team_id=${team}`} size={120} level="H" />
                    </div>
                    <p className="text-white font-bold mb-2"><FaUsers className="inline mr-2" /> Jugadores: {teamPlayers.length}</p>
                    <div className="w-full flex flex-wrap justify-center gap-2 mt-2">
                       {teamPlayers.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((p, index) => (
                          <span key={p.id} className="bg-pink-500/20 text-pink-300 text-xs px-3 py-1.5 rounded-full flex items-center gap-1 max-w-full shadow-sm">
                             <span className="font-black text-white mr-1">{index + 1}.</span>
                             <span className="truncate max-w-[100px] font-bold">{p.name}</span>
                             <button onClick={() => removePlayer(p.id)} className="text-red-400 hover:text-red-600 font-black ml-1 text-sm leading-none">&times;</button>
                          </span>
                       ))}
                    </div>
                 </div>
              )})}
           </div>

           <div className="flex items-center justify-center gap-6 mt-4">
              <button onClick={resetGame} className="bg-red-500/20 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-xl font-bold px-8 py-4 rounded-xl transition-all h-[64px]">
                 Reiniciar Juego
              </button>
              <button onClick={startGame} className="btn-3d-pink px-12 py-4 text-2xl tracking-widest font-black rounded-xl flex items-center gap-4 h-[64px] bg-pink-500 border-b-8 border-pink-700 text-white shadow-[0_5px_15px_rgba(236,72,153,0.5)] hover:bg-pink-400">
                <FaPlay /> COMENZAR JUEGO
              </button>
           </div>
         </>
       )}

       {session?.status === 'prep' && (
          <div className="flex flex-col items-center justify-center flex-1">
             <h2 className="text-5xl font-black text-white mb-4 uppercase">Ronda {session.current_round}</h2>
             <h3 className="text-3xl text-pink-500 font-bold mb-8 uppercase">¡Preparándose el Equipo {session.active_team}!</h3>
             <div className="w-48 h-48 rounded-full border-8 border-pink-500 flex items-center justify-center text-7xl font-black text-white animate-pulse shadow-[0_0_50px_rgba(236,72,153,0.8)]">
                {prepTimeLeft}
             </div>
          </div>
       )}

       <div className={`flex-1 w-full max-w-5xl flex flex-col ${session?.status === 'playing' ? 'block' : 'hidden'}`}>
          {gameState && (
             <>
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-4xl font-black text-white uppercase">Ronda {session.current_round}</h2>
                   <h3 className="text-3xl text-pink-500 font-bold uppercase">Equipo {session.active_team} Dibujando</h3>
                   <div className="bg-white/10 px-6 py-2 rounded-xl text-3xl font-black text-white flex items-center gap-4 border border-white/20">
                      <FaStopwatch className="text-pink-500" /> {Math.floor(gameState.time_elapsed_seconds / 60)}:{(gameState.time_elapsed_seconds % 60).toString().padStart(2, '0')}
                   </div>
                </div>

                <div className="flex justify-between items-center bg-pink-500/20 border-2 border-pink-500 rounded-2xl p-4 mb-4">
                   <p className="text-xl font-bold text-pink-300 uppercase">Dibujando:</p>
                   <p className="text-3xl font-black text-white">
                      {players.find(p => p.id === gameState.active_drawer_id)?.name || "..."}
                   </p>
                </div>

                {/* Canvas Area */}
                <div className="w-full bg-white rounded-xl overflow-hidden relative border-4 border-gray-300 shadow-[0_0_30px_rgba(255,255,255,0.1)] flex-1 min-h-[400px]">
                   <canvas ref={canvasRef} width={2000} height={1200} className="w-full h-full object-contain pointer-events-none" />
                   
                   {/* Overlay hints */}
                   <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10 pointer-events-none">
                     {gameState.current_word?.split('').map((char: string, i: number) => (
                        <span key={i} className="text-4xl font-black text-gray-800 tracking-[0.5em]">{char === ' ' ? '\u00A0' : '_'}</span>
                     ))}
                   </div>
                   
                   {/* Recent Guesses Floating */}
                   <div className="absolute bottom-4 left-4 flex flex-col gap-1 pointer-events-none">
                     {recentGuesses.map((g, i) => (
                        <div key={i} className="bg-black/50 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 animate-fade-in-up">
                           <span className="text-pink-400">{g.name}:</span> <span>{g.guess}</span>
                        </div>
                     ))}
                   </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-4">
                   <div className="w-full bg-black rounded-full h-8 overflow-hidden border border-white/20 relative">
                      <div className="bg-gradient-to-r from-pink-600 to-purple-400 h-full transition-all duration-500" style={{ width: `${(gameState.words_completed / 15) * 100}%` }}></div>
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-white drop-shadow-md">
                         {gameState.words_completed} / 15 Palabras
                      </div>
                   </div>
                </div>

                <div className="flex justify-center mt-4">
                   <button onClick={resetGame} className="bg-red-500/20 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold px-6 py-2 rounded-xl transition-all">
                      Reiniciar Juego
                   </button>
                   <button onClick={() => advanceWord(gameState)} className="ml-4 bg-gray-500/20 border-2 border-gray-500 text-gray-300 hover:bg-gray-500 hover:text-white font-bold px-6 py-2 rounded-xl transition-all">
                      Saltar Palabra
                   </button>
                </div>
             </>
          )}
       </div>

       {session?.status === 'round_end' && (
          <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl">
             <h2 className="text-5xl font-black text-white mb-8 uppercase text-pink-400">Fin de la Ronda {session.current_round}</h2>
             <div className="bg-[#20222f] w-full rounded-2xl border border-white/10 p-8 mb-8 shadow-2xl">
                <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-widest border-b border-white/10 pb-4">Tiempos del Equipo</h3>
                <div className="space-y-4">
                   {[1, 2, 3, 4].map(team => {
                      const time = teamTimes[session.current_round]?.[team];
                      return (
                         <div key={team} className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-white/5">
                            <span className="text-2xl font-bold text-pink-400">Equipo {team}</span>
                            <span className="text-3xl font-black text-white">
                               {time ? `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}` : '---'}
                            </span>
                         </div>
                      )
                   })}
                </div>
             </div>
             <button onClick={nextRound} className="btn-3d-pink px-12 py-4 text-2xl tracking-widest font-black rounded-xl flex items-center gap-4 bg-pink-500 border-b-8 border-pink-700 text-white shadow-[0_5px_15px_rgba(236,72,153,0.5)] hover:bg-pink-400">
                SIGUIENTE RONDA <FaArrowRight />
             </button>
          </div>
       )}

       {session?.status === 'finished' && (
          <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl relative">
             <Confetti width={window.innerWidth} height={window.innerHeight} recycle={true} numberOfPieces={300} />
             <FaTrophy className="text-8xl text-pink-400 drop-shadow-[0_0_30px_rgba(236,72,153,0.8)] mb-6 animate-bounce" />
             <h2 className="text-6xl font-black text-white mb-2 uppercase tracking-widest text-center leading-snug">¡JUEGO TERMINADO!</h2>
             
             <div className="bg-[#20222f] w-full rounded-2xl border-4 border-pink-500 p-8 my-8 shadow-[0_0_50px_rgba(236,72,153,0.3)] z-10">
                <h3 className="text-3xl font-black text-white mb-6 uppercase tracking-widest border-b border-white/10 pb-4">Tiempos Totales</h3>
                <div className="space-y-4">
                   {[1, 2, 3, 4].map(team => {
                      let totalTime = 0;
                      for(let r=1; r<=3; r++) {
                         totalTime += teamTimes[r]?.[team] || 0;
                      }
                      return (
                         <div key={team} className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-white/5">
                            <span className="text-2xl font-bold text-pink-400">Equipo {team}</span>
                            <span className="text-3xl font-black text-white">
                               {`${Math.floor(totalTime / 60)}:${(totalTime % 60).toString().padStart(2, '0')}`}
                            </span>
                         </div>
                      )
                   })}
                </div>
             </div>
             <button onClick={resetGame} className="btn-3d-pink px-12 py-4 text-2xl tracking-widest font-black rounded-xl z-10 bg-pink-500 border-b-8 border-pink-700 text-white shadow-[0_5px_15px_rgba(236,72,153,0.5)] hover:bg-pink-400">
                REINICIAR TODO
             </button>
          </div>
       )}
    </div>
  );
}

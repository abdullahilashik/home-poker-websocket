import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socket';
import { QRCodeSVG } from 'qrcode.react';
import { BookOpen, Trophy, X, UserX, Coins, TrendingUp, UserCheck, Play, StopCircle, SkipForward, ChevronRight, RefreshCw, Plus, Copy, Check, CheckCircle, Ban, UserMinus, Settings, Save, History, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

const GamePage: React.FC = () => {
  const { gameState, userInfo } = useGameStore();
  const [betAmount, setBetAmount] = useState('');
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [showBankSettings, setShowBankSettings] = useState(false);
  const [settings, setSettings] = useState({ minBet: 0, startingBalance: 0, smallBlind: 0, bigBlind: 0 });
  const [showRanking, setShowRanking] = useState(false);
  const [showCardRanking, setShowCardRanking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [hostIP, setHostIP] = useState('');

  useEffect(() => {
    if (gameState?.sessionId && userInfo) {
      socketService.connect();
      socketService.emit('join_game', { 
        sessionId: gameState.sessionId, 
        name: userInfo.name, 
        playerId: socketService.getPlayerId() 
      });
    }
  }, []);

  useEffect(() => {
    if (gameState) {
      setSettings({
        minBet: gameState.minBet,
        startingBalance: gameState.startingBalance,
        smallBlind: gameState.smallBlind,
        bigBlind: gameState.bigBlind,
      });
    }
  }, [gameState]);

  useEffect(() => {
    fetch(`http://${window.location.hostname}:3000/host-info`)
      .then(res => res.json())
      .then(data => setHostIP(data.ip))
      .catch(() => setHostIP(window.location.hostname));
  }, []);

  const copySessionId = () => {
    if (!gameState?.sessionId) return;
    navigator.clipboard.writeText(gameState.sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateBankSettings = () => {
    socketService.emit('update_settings', { 
      sessionId: gameState?.sessionId, 
      settings: { 
        minBet: settings.minBet, 
        startingBalance: settings.startingBalance 
      } 
    }, (res: any) => {
      if (res.success) {
        toast.success('Bank settings updated!');
        setShowBankSettings(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  if (!gameState || !userInfo || !gameState.players) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xl font-medium">Loading Game State...</div>;

  const isHost = gameState.players.find(p => p.id === userInfo.id)?.isHost;
  const myId = socketService.getPlayerId();
  const myPlayer = gameState.players.find(p => p.id === myId);
  const maxBet = Math.max(...gameState.players.map(p => p.currentBet));
  const myBet = myPlayer?.currentBet ?? 0;
  const canCheck = myBet >= maxBet;
  const isInRound = ['pre_flop', 'flop', 'turn', 'river'].includes(gameState.status);
  const streetLabel: Record<string, string> = { pre_flop: 'Pre-Flop', flop: 'Flop', turn: 'Turn', river: 'River' };
  const streetOrder = ['pre_flop', 'flop', 'turn', 'river'];

  const handleStartRound = () => {
    socketService.emit('start_round', { sessionId: gameState.sessionId }, (res: any) => {
      if (!res.success) toast.error(res.error);
      else toast.success('Round started!');
    });
  };

  const handleCheck = () => {
    socketService.emit('check', {
      sessionId: gameState.sessionId,
      playerId: socketService.getPlayerId()
    }, (res: any) => {
      if (!res.success) toast.error(res.error);
      else toast.success('Checked');
    });
  };

  const handleAdvanceStreet = () => {
    socketService.emit('advance_street', { sessionId: gameState.sessionId }, (res: any) => {
      if (!res.success) toast.error(res.error);
      else toast.success('Street advanced!');
    });
  };

  const handleEndRound = () => {
    socketService.emit('end_round', { sessionId: gameState.sessionId }, (res: any) => {
      if (!res.success) toast.error(res.error);
      else toast.success('Moved to showdown!');
    });
  };

  const handlePlaceBet = () => {
    const amount = parseInt(betAmount);
    if (isNaN(amount) || amount <= 0) return toast.error('Enter a valid amount');
    socketService.emit('place_bet', { 
      sessionId: gameState.sessionId, 
      playerId: socketService.getPlayerId(), 
      amount 
    }, (res: any) => {
      if (!res.success) toast.error(res.error);
      else toast.success('Bet placed!');
      setBetAmount('');
    });
  };

  const handleCall = () => {
    socketService.emit('call', { 
      sessionId: gameState.sessionId, 
      playerId: socketService.getPlayerId() 
    }, (res: any) => {
      if (!res.success) toast.error(res.error);
      else toast.success('Call successful!');
    });
  };

  const handleRaise = () => {
    const amount = parseInt(betAmount);
    if (isNaN(amount) || amount <= 0) return toast.error('Enter raise amount');
    socketService.emit('raise', { 
      sessionId: gameState.sessionId, 
      playerId: socketService.getPlayerId(), 
      raiseAmount: amount 
    }, (res: any) => {
      if (!res.success) toast.error(res.error);
      else toast.success('Raise successful!');
      setBetAmount('');
    });
  };

  const handleFold = () => {
    socketService.emit('fold', { 
      sessionId: gameState.sessionId, 
      playerId: socketService.getPlayerId() 
    }, (res: any) => {
      if (!res.success) toast.error(res.error);
      else toast.success('Folded');
    });
  };

  const confirmWinners = () => {
    if (selectedWinners.length === 0) return toast.error('Select at least one winner');
    socketService.emit('select_winners', { sessionId: gameState.sessionId, winnerIds: selectedWinners }, (res: any) => {
      if (!res.success) toast.error(res.error);
      else {
        toast.success('Pot distributed!');
        setSelectedWinners([]);
      }
    });
  };

  const toggleWinner = (id: string) => {
    setSelectedWinners(prev => 
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const handleRemovePlayer = (playerId: string) => {
    if (!window.confirm('Are you sure you want to remove this player?')) return;
    socketService.emit('remove_player', { 
      sessionId: gameState.sessionId, 
      playerId 
    }, (res: any) => {
      if (!res.success) toast.error(res.error);
      else toast.success('Player removed');
    });
  };

  const handleTogglePause = (playerId: string) => {
    socketService.emit('toggle_pause', { 
      sessionId: gameState.sessionId, 
      playerId 
    }, (res: any) => {
      if (!res.success) toast.error(res.error);
      else toast.success('Player state updated');
    });
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 font-sans selection:bg-indigo-500/30">
      {/* Header Section */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-8 p-6 rounded-3xl bg-slate-800/40 backdrop-blur-md border border-slate-700/50 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Coins className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Session {gameState.sessionId.slice(0, 6)}
              {isHost && (
                <div className="flex items-center gap-1">
                  <button 
                    onClick={copySessionId}
                    className="p-1 hover:bg-slate-700 rounded-md transition-colors group relative"
                    title="Copy Session ID"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-slate-400 group-hover:text-white" />}
                  </button>
                  <button 
                    onClick={() => setShowQR(true)}
                    className="p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-400 hover:text-white"
                    title="Show QR Code"
                  >
                    <Smartphone size={14} />
                  </button>
                  <button 
                    onClick={() => setShowBankSettings(true)}
                    className="p-1 hover:bg-slate-700 rounded-md transition-colors text-slate-400 hover:text-white"
                    title="Bank Settings"
                  >
                    <Settings size={14} />
                  </button>
                </div>
              )}
            </h1>
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                isInRound ? 'bg-green-500' : gameState.status === 'showdown' ? 'bg-indigo-500' : 'bg-slate-500'
              }`}></span>
              Round {gameState.currentRound} • {gameState.players.length} Players
              {isInRound && <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase">{streetLabel[gameState.status]}</span>}
              {gameState.status === 'showdown' && <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase">Showdown</span>}
            </p>
          </div>
        </div>
        
        <div className="bg-slate-900/80 px-6 py-3 rounded-2xl border border-slate-700 flex items-center gap-6">
          <button
            onClick={() => setShowCardRanking(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors group relative"
            title="Poker Hand Rankings"
          >
            <BookOpen size={18} className="text-blue-400" />
          </button>
          <button
            onClick={() => setShowRanking(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors group relative"
            title="Player Rankings"
          >
            <Trophy size={18} className="text-yellow-500" />
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors group relative"
            title="Round History"
          >
            <History size={18} className="text-slate-400" />
          </button>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Your Wallet</p>
            <p className="text-2xl font-mono font-black text-green-400">
              ${gameState.players.find(p => p.id === userInfo.id)?.balance.toFixed(2)}
            </p>
          </div>
          <div className="w-px h-8 bg-slate-700"></div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Current Bet</p>
            <p className="text-2xl font-mono font-black text-indigo-400">
              ${gameState.players.find(p => p.id === userInfo.id)?.currentBet.toFixed(2)}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Pot & Players */}
        <div className="lg:col-span-2 space-y-8">
          {/* Pot Display */}
          <section className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 shadow-2xl text-center group">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-500/10 rounded-full mb-4">
                <Coins className="text-yellow-500 w-6 h-6" />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold block mb-2">Current Pot</span>
              <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 drop-shadow-sm">
                ${gameState.pot.toFixed(2)}
              </span>
              <p className="text-xs text-slate-500 mt-4 font-mono uppercase tracking-widest">Min Bet: ${gameState.minBet}</p>
            </div>
          </section>

          {/* Players Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gameState.players.map((player, index) => (
              <div 
                key={player.id} 
                className={`group relative p-5 rounded-2xl transition-all duration-300 border ${
                  player.id === userInfo.id 
                    ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/30' 
                    : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                } ${player.isFolded ? 'opacity-40 grayscale' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-all ${
                      player.id === userInfo.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'bg-slate-700 text-slate-300'
                    } ${index === gameState.activePlayerIndex ? 'ring-4 ring-yellow-500 animate-pulse' : ''}`}>
                      {player.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        {player.name}
                        {player.isHost && <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase font-black">Host</span>}
                        {index === gameState.activePlayerIndex && isInRound && (
                          <span className="text-[10px] bg-yellow-500 text-slate-900 px-1.5 py-0.5 rounded uppercase font-black">Dealer</span>
                        )}
                        {player.isAllIn && (
                          <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded uppercase font-black">All-In</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                        ${player.balance.toFixed(2)}
                        {gameState.status === 'pre_flop' && player.currentBet === gameState.smallBlind && player.currentBet > 0 && (
                          <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-bold">SB</span>
                        )}
                        {gameState.status === 'pre_flop' && player.currentBet === gameState.bigBlind && player.currentBet > 0 && (
                          <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-bold">BB</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isHost && player.id !== userInfo.id && (
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleTogglePause(player.id)}
                          className={`p-2 rounded-lg transition-colors ${player.isPaused ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                          title={player.isPaused ? "Resume Player" : "Pause Player"}
                        >
                          <Ban size={16} />
                        </button>
                        <button 
                          onClick={() => handleRemovePlayer(player.id)}
                          className="p-2 bg-slate-700 text-slate-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                          title="Remove Player"
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Bet</p>
                      <p className={`font-mono font-bold text-lg ${player.currentBet > 0 ? 'text-indigo-400' : 'text-slate-600'}`}>
                        ${player.currentBet.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                {player.isFolded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 rounded-2xl pointer-events-none">
                    <span className="bg-slate-800 text-slate-400 text-xs font-bold px-3 py-1 rounded-full border border-slate-700 uppercase">Folded</span>
                  </div>
                )}
                {player.isPaused && (
                  <div className="absolute inset-0 flex items-center justify-center bg-yellow-500/10 rounded-2xl pointer-events-none">
                    <span className="bg-yellow-500/20 text-yellow-500 text-xs font-bold px-3 py-1 rounded-full border border-yellow-500/30 uppercase">Paused</span>
                  </div>
                )}
              </div>
            ))}
          </section>
        </div>

        {/* Right Col: Betting Controls */}
        <aside className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-800/60 backdrop-blur-md border border-slate-700 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
              <TrendingUp size={16} /> Action Panel
            </h3>
            
            {gameState.status === 'lobby' && (
              <div className="space-y-4">
                {isHost ? (
                  <button 
                    onClick={handleStartRound}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                  >
                    <Play size={20} fill="currentColor" /> Start New Round
                  </button>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700 text-center">
                    <div className="animate-bounce mb-3 inline-block p-2 bg-slate-700 rounded-full">
                      <RefreshCw size={20} className="text-slate-400" />
                    </div>
                    <p className="text-slate-400 text-sm italic">Waiting for the host to deal the round...</p>
                  </div>
                )}
              </div>
            )}

            {gameState.status === 'showdown' && (
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700 text-center">
                  <div className="animate-pulse mb-3 inline-block p-2 bg-indigo-500/20 rounded-full">
                    <UserCheck size={20} className="text-indigo-400" />
                  </div>
                  <p className="text-slate-400 text-sm italic">Select winners to distribute the pot.</p>
                </div>
              </div>
            )}

            {gameState.status === 'ended' && (
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-700 text-center">
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Game Over</p>
              </div>
            )}

            {isInRound && (
              <div className="space-y-6">
                {/* Street Indicator */}
                <div className="flex items-center justify-between px-2">
                  {streetOrder.map((s, i) => {
                    const currentIdx = streetOrder.indexOf(gameState.status);
                    const isActive = i === currentIdx;
                    const isPast = i < currentIdx;
                    return (
                      <div key={s} className="flex items-center gap-1">
                        <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-all ${
                          isActive ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                          isPast ? 'text-slate-600' : 'text-slate-700'
                        }`}>
                          {streetLabel[s]}
                        </div>
                        {i < streetOrder.length - 1 && (
                          <ChevronRight size={12} className={isPast ? 'text-slate-600' : 'text-slate-700'} />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Bet Amount</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</div>
                    <input 
                      type="number" 
                      value={betAmount} 
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-4 bg-slate-900 border border-slate-700 rounded-2xl text-white font-mono text-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handlePlaceBet} className="p-4 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all active:scale-95 flex flex-col items-center gap-2">
                    <Coins size={20} className="text-yellow-500" />
                    <span className="text-xs">Bet</span>
                  </button>
                  {canCheck ? (
                    <button onClick={handleCheck} className="p-4 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all active:scale-95 flex flex-col items-center gap-2">
                      <CheckCircle size={20} className="text-green-500" />
                      <span className="text-xs">Check</span>
                    </button>
                  ) : (
                    <button onClick={handleCall} className="p-4 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all active:scale-95 flex flex-col items-center gap-2">
                      <TrendingUp size={20} className="text-green-500" />
                      <span className="text-xs">Call</span>
                    </button>
                  )}
                  <button onClick={handleRaise} className="p-4 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all active:scale-95 flex flex-col items-center gap-2">
                    <Plus size={20} className="text-indigo-500" />
                    <span className="text-xs">Raise</span>
                  </button>
                  <button onClick={handleFold} className="p-4 rounded-2xl bg-slate-700 hover:bg-slate-600 text-red-400 font-bold transition-all active:scale-95 flex flex-col items-center gap-2">
                    <UserX size={20} />
                    <span className="text-xs">Fold</span>
                  </button>
                </div>

                {isHost && (
                  <div className="space-y-2">
                    <button 
                      onClick={handleAdvanceStreet}
                      disabled={gameState.status === 'river'}
                      className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
                        gameState.status === 'river'
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                          : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      <SkipForward size={16} /> Next Street — {streetLabel[gameState.status]} → {streetOrder[streetOrder.indexOf(gameState.status) + 1] && streetLabel[streetOrder[streetOrder.indexOf(gameState.status) + 1]]}
                    </button>
                    <button 
                      onClick={handleEndRound}
                      className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold transition-all border border-red-500/20 flex items-center justify-center gap-2 text-sm"
                    >
                      <StopCircle size={16} /> End Round → Showdown
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Bank Settings Modal */}
      {showBankSettings && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl border border-slate-700 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Settings className="text-indigo-500 w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white">Bank Settings</h2>
              </div>
              <button 
                onClick={() => setShowBankSettings(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <UserX size={20} />
              </button>
            </div>
            
            <div className="space-y-6 mb-8">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Global Starting Balance</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</div>
                  <input 
                    type="number" 
                    value={settings.startingBalance} 
                    onChange={(e) => setSettings(prev => ({ ...prev, startingBalance: Number(e.target.value) }))}
                    className="w-full pl-7 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Minimum Bet Amount</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</div>
                  <input 
                    type="number" 
                    value={settings.minBet} 
                    onChange={(e) => setSettings(prev => ({ ...prev, minBet: Number(e.target.value) }))}
                    className="w-full pl-7 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700">
                <div className="flex-1 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Small Blind</p>
                  <p className="text-lg font-mono font-black text-slate-300">${gameState.smallBlind}</p>
                </div>
                <div className="w-px bg-slate-700" />
                <div className="flex-1 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Big Blind</p>
                  <p className="text-lg font-mono font-black text-slate-300">${gameState.bigBlind}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Starting Player Turn</label>
                <select 
                  value={gameState.activePlayerIndex}
                  onChange={(e) => {
                    socketService.emit('update_settings', { 
                      sessionId: gameState.sessionId, 
                      settings: { activePlayerIndex: parseInt(e.target.value) } 
                    }, (res: any) => {
                      if (!res.success) toast.error(res.error);
                      else toast.success('Turn updated!');
                    });
                  }}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {gameState.players.map((p, idx) => (
                    <option key={p.id} value={idx}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <button 
              onClick={updateBankSettings}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <Save size={20} /> Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Winner Selection Modal */}
      {isHost && gameState.status === 'showdown' && gameState.pot > 0 && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl border border-slate-700 ring-1 ring-white/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <UserCheck className="text-green-500 w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Distribute Pot</h2>
            </div>
            
            <p className="text-slate-400 text-sm mb-6">Select one or more winners to split the ${gameState.pot.toFixed(2)} pot.</p>
            
            <div className="space-y-3 mb-8">
              {gameState.players.map(p => (
                <label 
                  key={p.id} 
                  className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${
                    selectedWinners.includes(p.id) 
                      ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={selectedWinners.includes(p.id)}
                      onChange={() => toggleWinner(p.id)}
                      className="w-5 h-5 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
                    />
                    <span className="font-bold">{p.name}</span>
                  </div>
                  <span className="text-xs font-mono">${p.balance.toFixed(2)}</span>
                </label>
              ))}
            </div>
            
            <button 
              onClick={confirmWinners}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-lg shadow-indigo-600/30"
            >
              Confirm Distribution
            </button>
          </div>
        </div>
      )}

      {/* Rankings Modal */}
      {showRanking && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl border border-slate-700 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Trophy className="text-yellow-500 w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white">Rankings</h2>
              </div>
              <button
                onClick={() => setShowRanking(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {[...gameState.players]
                .sort((a, b) => b.balance - a.balance)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border ${
                      player.id === userInfo.id
                        ? 'bg-indigo-600/10 border-indigo-500/50'
                        : 'bg-slate-900/50 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                        index === 0 ? 'bg-yellow-500 text-slate-900' :
                        index === 1 ? 'bg-slate-400 text-slate-900' :
                        index === 2 ? 'bg-amber-700 text-white' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <span className="font-bold text-white flex items-center gap-2">
                          {player.name}
                          {player.isHost && <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase font-black">Host</span>}
                        </span>
                        <span className="text-xs text-slate-500">{player.isFolded ? 'Folded' : 'Active'}</span>
                      </div>
                    </div>
                    <span className="text-lg font-mono font-black text-green-400">${player.balance.toFixed(2)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl border border-slate-700 ring-1 ring-white/10 text-center">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Join via QR</h2>
              <button
                onClick={() => setShowQR(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="bg-white p-4 rounded-2xl inline-block mb-4">
              <QRCodeSVG value={`http://${hostIP}:${window.location.port}/?session=${gameState.sessionId}`} size={200} />
            </div>
            <p className="text-slate-400 text-sm mb-1">Scan to join this game</p>
            <p className="text-[10px] text-slate-600 break-all">http://{hostIP}:{window.location.port}/?session={gameState.sessionId}</p>
          </div>
        </div>
      )}

      {/* Round History Sidebar */}
      {showHistory && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setShowHistory(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <History className="text-indigo-400 w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-white">Round History</h2>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {gameState.history.length === 0 ? (
                <div className="text-center py-12">
                  <History size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No rounds played yet</p>
                </div>
              ) : (
                [...gameState.history].reverse().map((entry) => (
                  <div key={entry.round} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Round {entry.round}</span>
                      <span className="text-[10px] text-slate-600">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-lg font-mono font-black text-yellow-400 mb-2">${entry.pot.toFixed(2)} Pot</p>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.winnerIds.map((wid) => {
                        const p = gameState.players.find(pl => pl.id === wid);
                        return (
                          <span key={wid} className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20 font-bold">
                            {p?.name ?? 'Unknown'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Poker Hand Rankings Sidebar */}
      {showCardRanking && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setShowCardRanking(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <BookOpen className="text-blue-400 w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-white">Hand Rankings</h2>
              </div>
              <button
                onClick={() => setShowCardRanking(false)}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {([
                { rank: 1, name: 'Royal Flush', desc: 'A-K-Q-J-10, all same suit', color: 'text-red-400',
                  cards: [
                    { r: 'A', s: '♠', red: false }, { r: 'K', s: '♠', red: false }, { r: 'Q', s: '♠', red: false },
                    { r: 'J', s: '♠', red: false }, { r: '10', s: '♠', red: false },
                  ]},
                { rank: 2, name: 'Straight Flush', desc: 'Five consecutive cards, same suit', color: 'text-orange-400',
                  cards: [
                    { r: '9', s: '♥', red: true }, { r: '8', s: '♥', red: true }, { r: '7', s: '♥', red: true },
                    { r: '6', s: '♥', red: true }, { r: '5', s: '♥', red: true },
                  ]},
                { rank: 3, name: 'Four of a Kind', desc: 'Four cards of the same rank', color: 'text-yellow-400',
                  cards: [
                    { r: 'K', s: '♣', red: false }, { r: 'K', s: '♣', red: false }, { r: 'K', s: '♣', red: false },
                    { r: 'K', s: '♣', red: false }, { r: '2', s: '♦', red: true },
                  ]},
                { rank: 4, name: 'Full House', desc: 'Three of a kind + a pair', color: 'text-green-400',
                  cards: [
                    { r: 'Q', s: '♠', red: false }, { r: 'Q', s: '♠', red: false }, { r: 'Q', s: '♠', red: false },
                    { r: '7', s: '♥', red: true }, { r: '7', s: '♥', red: true },
                  ]},
                { rank: 5, name: 'Flush', desc: 'Five cards of the same suit', color: 'text-blue-400',
                  cards: [
                    { r: 'A', s: '♦', red: true }, { r: 'J', s: '♦', red: true }, { r: '9', s: '♦', red: true },
                    { r: '5', s: '♦', red: true }, { r: '3', s: '♦', red: true },
                  ]},
                { rank: 6, name: 'Straight', desc: 'Five consecutive cards, any suit', color: 'text-indigo-400',
                  cards: [
                    { r: '10', s: '♣', red: false }, { r: '9', s: '♦', red: true }, { r: '8', s: '♥', red: true },
                    { r: '7', s: '♠', red: false }, { r: '6', s: '♣', red: false },
                  ]},
                { rank: 7, name: 'Three of a Kind', desc: 'Three cards of the same rank', color: 'text-purple-400',
                  cards: [
                    { r: '8', s: '♠', red: false }, { r: '8', s: '♠', red: false }, { r: '8', s: '♠', red: false },
                    { r: 'K', s: '♥', red: true }, { r: '4', s: '♣', red: false },
                  ]},
                { rank: 8, name: 'Two Pair', desc: 'Two different pairs', color: 'text-pink-400',
                  cards: [
                    { r: 'J', s: '♠', red: false }, { r: 'J', s: '♠', red: false }, { r: '5', s: '♥', red: true },
                    { r: '5', s: '♥', red: true }, { r: 'A', s: '♣', red: false },
                  ]},
                { rank: 9, name: 'One Pair', desc: 'One pair of matching ranks', color: 'text-slate-300',
                  cards: [
                    { r: '10', s: '♠', red: false }, { r: '10', s: '♠', red: false }, { r: '8', s: '♥', red: true },
                    { r: '4', s: '♣', red: false }, { r: 'K', s: '♦', red: true },
                  ]},
                { rank: 10, name: 'High Card', desc: 'Highest card wins if no other hand', color: 'text-slate-500',
                  cards: [
                    { r: 'A', s: '♠', red: false }, { r: 'K', s: '♦', red: true }, { r: 'Q', s: '♣', red: false },
                    { r: 'J', s: '♥', red: true }, { r: '9', s: '♠', red: false },
                  ]},
              ] as const).map((hand) => (
                <div
                  key={hand.rank}
                  className="p-3 rounded-xl bg-slate-800/50 border border-slate-700"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs bg-slate-700 text-slate-400 shrink-0">
                      {hand.rank}
                    </span>
                    <div className="flex gap-0.5">
                      {hand.cards.map((card, ci) => (
                        <div
                          key={ci}
                          className={`w-7 h-10 rounded flex flex-col items-center justify-center text-[9px] font-bold leading-tight shadow-sm border ${
                            hand.rank < 4 ? 'bg-gradient-to-b from-white to-slate-100 border-slate-300' : 'bg-white border-slate-300'
                          }`}
                        >
                          <span className={card.red ? 'text-red-500' : 'text-gray-900'}>{card.r}</span>
                          <span className={card.red ? 'text-red-500' : 'text-gray-900'}>{card.s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-sm ${hand.color}`}>{hand.name}</p>
                    <span className="text-[10px] text-slate-600">— {hand.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePage;

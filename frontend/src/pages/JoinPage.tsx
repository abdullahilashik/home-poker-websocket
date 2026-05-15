import React, { useState } from 'react';
import { socketService } from '../services/socket';
import { useGameStore } from '../store/gameStore';
import { useNavigate } from 'react-router-dom';
import { Wallet, Users, PlusCircle, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

const JoinPage: React.FC = () => {
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [startingBalance, setStartingBalance] = useState('1000');
  const [minBet, setMinBet] = useState('10');
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();
  const setGameState = useGameStore((state) => state.setGameState);
  const setUserInfo = useGameStore((state) => state.setUserInfo);

  const handleJoin = async () => {
    if (!name || !sessionId) {
      toast.error('Please enter both name and session ID');
      return;
    }
    
    const socket = socketService.connect();
    socket?.emit('join_game', { 
      sessionId, 
      name, 
      playerId: socketService.getPlayerId() 
    }, (response: any) => {
      if (response.success) {
        setGameState(response.state);
        setUserInfo({ id: response.player.id, name: response.player.name });
        navigate('/game');
        toast.success('Joined game successfully!');
      } else {
        toast.error(response.error);
      }
    });
  };

  const handleCreate = async () => {
    if (!name) {
      toast.error('Please enter your name');
      return;
    }
    
    const socket = socketService.connect();
    socket?.emit('create_game', { 
      name, 
      playerId: socketService.getPlayerId(),
      startingBalance: parseInt(startingBalance),
      minBet: parseInt(minBet)
    }, (response: any) => {
      if (response.success === false) {
        toast.error(response.error);
        return;
      }
      setGameState(response);
      setUserInfo({ id: socket?.id || '', name });
      navigate('/game');
      toast.success('Game created!');
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 text-slate-100">
      <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-700 max-w-md w-full ring-1 ring-white/10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-4">
            <Wallet className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            Poker<span className="text-indigo-500">Bank</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Real-time financial management for physical games</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Player Name</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-white placeholder:text-slate-600"
                placeholder="Enter your name..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Session ID</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 font-mono text-xs">#</div>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-white placeholder:text-slate-600"
                placeholder="Join an existing game..."
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={handleJoin}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              Join Game
            </button>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-700"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-800 px-2 text-slate-500">or</span></div>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white text-xs transition-colors"
              >
                <Settings size={14} /> {showSettings ? 'Hide' : 'Show'} Setup Settings
              </button>
              
              {showSettings && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900/80 rounded-2xl border border-slate-700 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Start Balance</label>
                    <input 
                      type="number" 
                      value={startingBalance} 
                      onChange={(e) => setStartingBalance(e.target.value)}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Min Bet</label>
                    <input 
                      type="number" 
                      value={minBet} 
                      onChange={(e) => setMinBet(e.target.value)}
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
              )}
              
              <button
                onClick={handleCreate}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <PlusCircle size={20} /> Create New Game
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinPage;

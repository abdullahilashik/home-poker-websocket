import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import JoinPage from './pages/JoinPage';
import GamePage from './pages/GamePage';
import { useGameStore } from './store/gameStore';
import { Toaster } from 'react-hot-toast';

const App: React.FC = () => {
  const gameState = useGameStore((state) => state.gameState);

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<JoinPage />} />
        <Route 
          path="/game" 
          element={gameState ? <GamePage /> : <Navigate to="/" />} 
        />
      </Routes>
    </Router>
  );
};

export default App;

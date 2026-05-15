import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GameState, UserInfo } from '../types/game';

interface GameStore {
  gameState: GameState | null;
  userInfo: UserInfo | null;
  setGameState: (state: GameState | null) => void;
  setUserInfo: (user: UserInfo | null) => void;
  clearStore: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      gameState: null,
      userInfo: null,
      setGameState: (state) => set({ gameState: state }),
      setUserInfo: (user) => set({ userInfo: user }),
      clearStore: () => set({ gameState: null, userInfo: null }),
    }),
    {
      name: 'poker-bank-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        userInfo: state.userInfo, 
        // We only persist the sessionId, not the whole gameState, 
        // because the gameState should be synced from server on load.
        gameState: state.gameState ? { sessionId: state.gameState.sessionId } : null 
      }),
    }
  )
);


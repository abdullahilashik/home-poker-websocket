# Real-Time Poker Bank Manager

A production-quality full-stack web application for managing money, bets, and pot tracking during physical poker games.

## 🚀 Features

- **Real-time Updates**: Powered by WebSockets (Socket.IO) for instant balance and pot updates across all devices.
- **Host Controls**: The game creator can start rounds and select winners to distribute the pot.
- **Player Interface**: Mobile-first design allowing players to bet, call, raise, or fold.
- **In-Memory State**: Fast, real-time state management for a seamless gaming experience.

## 🛠 Tech Stack

- **Backend**: Node.js, NestJS, Socket.IO, TypeScript
- **Frontend**: React, TypeScript, TailwindCSS, Zustand, Socket.IO-client

## 📦 Installation & Setup

### Prerequisites
- Node.js (LTS recommended)
- npm

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm run start:dev
   ```
   The server will run on `http://localhost:3000`.

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   Open the provided URL (usually `http://localhost:5173`) in your browser.

## 🌐 Local Network Usage

To allow players to join from their mobile devices:
1. Find your computer's local IP address (e.g., `192.168.1.10`).
2. Update the `SOCKET_URL` in `frontend/src/services/socket.ts` from `http://localhost:3000` to `http://<your-ip>:3000`.
3. Ensure your firewall allows traffic on port 3000.
4. Players can then access the frontend via your IP and the port provided by Vite.

## 📡 WebSocket API

### Client → Server
- `create_game`: Creates a new session. Returns `GameState`.
- `join_game`: Joins a session. Payload: `{ sessionId, name }`.
- `start_round`: Host starts a round. Payload: `{ sessionId }`.
- `place_bet`: Player bets an amount. Payload: `{ sessionId, amount }`.
- `call`: Player matches the current highest bet. Payload: `{ sessionId }`.
- `raise`: Player raises the bet. Payload: `{ sessionId, raiseAmount }`.
- `fold`: Player folds. Payload: `{ sessionId }`.
- `end_round`: Host ends the round. Payload: `{ sessionId }`.
- `select_winners`: Host distributes the pot. Payload: `{ sessionId, winnerIds: string[] }`.

### Server → Client
- `game_state`: Broadcasts the updated `GameState`.
- `player_joined`: Notifies that a new player has joined.
- `round_started`: Notifies that a round has begun.
- `round_ended`: Notifies that a round has ended.
- `error`: Sends an error message.

## 📂 Project Structure

- `/backend`: NestJS application
  - `/src/game`: Core game logic, service, and WebSocket gateway.
  - `/src/game/interfaces`: Shared types for game state.
- `/frontend`: React application
  - `/src/pages`: UI pages (Join, Game).
  - `/src/store`: Zustand store for global state.
  - `/src/services`: WebSocket connection management.
  - `/src/types`: TypeScript interfaces.


# Run this powershell command to expose the shareable address

New-NetFirewallRule -DisplayName "Node Dev Servers" -Direction Inbound -Protocol TCP -LocalPort 3000,5173 -Action Allow
New-NetFirewallRule -DisplayName "Node Dev Servers" -Direction Inbound -Protocol TCP -LocalPort 3000,5173 -Action Allow
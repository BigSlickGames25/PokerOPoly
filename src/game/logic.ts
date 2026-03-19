// Core game logic for Pokeropoly
import { GameState, Player, Card, BoardSpace, Rank, Suit } from './types';

// Utility: create a standard deck
export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  let id = 0;
  return suits.flatMap(suit => ranks.map(rank => ({
    suit,
    rank,
    id: `${suit}-${rank}`,
  })));
}

// Utility: shuffle array
export function shuffle<T>(arr: T[]): T[] {
  return arr
    .map(a => [Math.random(), a] as [number, T])
    .sort((a, b) => a[0] - b[0])
    .map(a => a[1]);
}

// Initialize game state
export function initGame(playerNames: string[]): GameState {
  const cards = shuffle(createDeck());
  const board: BoardSpace[] = cards.map((card, i) => ({ index: i, cardId: card.id }));
  const players: Player[] = playerNames.map((name, i) => ({
    id: `P${i+1}`,
    name,
    position: 0,
    chips: 1000,
    cards: [],
    isActive: true,
  }));
  return {
    players,
    cards,
    board,
    currentPlayer: 0,
    pot: 0,
    phase: 'roll',
  };
}

// Dice roll (2d6)
export function rollDice(): [number, number] {
  return [1 + Math.floor(Math.random()*6), 1 + Math.floor(Math.random()*6)];
}

// Move player
export function movePlayer(state: GameState, playerIdx: number, steps: number): GameState {
  const player = state.players[playerIdx];
  const newPos = (player.position + steps) % state.board.length;
  const updatedPlayers = state.players.map((p, i) => i === playerIdx ? { ...p, position: newPos } : p);
  return { ...state, players: updatedPlayers };
}

// Purchase card
export function purchaseCard(state: GameState, playerIdx: number, cardId: string, price: number): GameState {
  const player = state.players[playerIdx];
  if (player.chips < price) return state; // not enough chips
  const updatedCards = state.cards.map(card => card.id === cardId ? { ...card, ownerId: player.id } : card);
  const updatedPlayers = state.players.map((p, i) => i === playerIdx ? { ...p, chips: p.chips - price, cards: [...p.cards, cardId] } : p);
  return { ...state, cards: updatedCards, players: updatedPlayers };
}

// Sell card
export function sellCard(state: GameState, playerIdx: number, cardId: string, price: number): GameState {
  const player = state.players[playerIdx];
  if (!player.cards.includes(cardId)) return state;
  const updatedCards = state.cards.map(card => card.id === cardId ? { ...card, ownerId: undefined } : card);
  const updatedPlayers = state.players.map((p, i) => i === playerIdx ? { ...p, chips: p.chips + price, cards: p.cards.filter(id => id !== cardId) } : p);
  return { ...state, cards: updatedCards, players: updatedPlayers };
}

// Get cards owned by player
export function getPlayerCards(state: GameState, playerId: string): Card[] {
  return state.cards.filter(card => card.ownerId === playerId);
}

// Poker hand evaluation (returns best hand and surplus)
// Placeholder: returns all cards as surplus, no hand logic yet
export function evaluatePokerHand(cards: Card[]): { bestHand: Card[]; surplus: Card[] } {
  // TODO: Implement real poker hand evaluation
  return { bestHand: cards.slice(0, 5), surplus: cards.slice(5) };
}

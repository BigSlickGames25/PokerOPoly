export type Vector = {
  x: number;
  y: number;
};

export type ArenaSize = {
  width: number;
  height: number;
};

export type GameEvent = "none" | "collect" | "hit" | "pulse" | "game-over";

export type Player = {
  health: number;
  invulnerableFor: number;
  position: Vector;
  radius: number;
};

export type Orb = {
  position: Vector;
  radius: number;
};

export type Hazard = {
  id: string;
  position: Vector;
  radius: number;
  velocity: Vector;
};

export type GameInput = {
  boost: boolean;
  move: Vector;
  pulse: boolean;
};

export type GameWorld = {
  arena: ArenaSize;
  boostEnergy: number;
  difficulty: number;
  event: GameEvent;
  eventNonce: number;
  gameOver: boolean;
  hazards: Hazard[];
  orb: Orb;
  player: Player;
  pulseCooldown: number;
  score: number;
  time: number;
};


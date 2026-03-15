import { clamp } from "../theme";
import { ArenaSize, GameInput, GameWorld, Hazard, Orb, Vector } from "./types";

const PLAYER_RADIUS = 18;
const ORB_RADIUS = 12;
const INITIAL_HEALTH = 3;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function distance(a: Vector, b: Vector) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function randomPoint(arena: ArenaSize, margin: number): Vector {
  return {
    x: randomBetween(margin, arena.width - margin),
    y: randomBetween(margin, arena.height - margin)
  };
}

function createOrb(arena: ArenaSize, playerPosition?: Vector): Orb {
  let position = randomPoint(arena, 36);

  if (playerPosition) {
    while (distance(position, playerPosition) < 96) {
      position = randomPoint(arena, 36);
    }
  }

  return {
    position,
    radius: ORB_RADIUS
  };
}

function createHazard(
  arena: ArenaSize,
  index: number,
  avoidPosition?: Vector
): Hazard {
  const speed = 74 + index * 14;
  const angle = randomBetween(0, Math.PI * 2);
  let position = randomPoint(arena, 42);

  if (avoidPosition) {
    while (distance(position, avoidPosition) < 132) {
      position = randomPoint(arena, 42);
    }
  }

  return {
    id: `${Date.now()}-${index}-${Math.round(Math.random() * 1000)}`,
    position,
    radius: 14 + (index % 2) * 4,
    velocity: {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    }
  };
}

function stampEvent(world: GameWorld, event: GameWorld["event"]) {
  return {
    ...world,
    event,
    eventNonce: world.eventNonce + 1
  };
}

export function createWorld(arena: ArenaSize): GameWorld {
  const playerPosition = {
    x: arena.width / 2,
    y: arena.height / 2
  };

  return {
    arena,
    boostEnergy: 100,
    difficulty: 1,
    event: "none",
    eventNonce: 0,
    gameOver: false,
    hazards: [
      createHazard(arena, 0, playerPosition),
      createHazard(arena, 1, playerPosition)
    ],
    orb: createOrb(arena, playerPosition),
    player: {
      health: INITIAL_HEALTH,
      invulnerableFor: 0,
      position: playerPosition,
      radius: PLAYER_RADIUS
    },
    pulseCooldown: 0,
    score: 0,
    time: 0
  };
}

export function resizeWorld(world: GameWorld, arena: ArenaSize): GameWorld {
  if (!world.arena.width || !world.arena.height) {
    return createWorld(arena);
  }

  const scaleX = arena.width / world.arena.width;
  const scaleY = arena.height / world.arena.height;

  return {
    ...world,
    arena,
    hazards: world.hazards.map((hazard) => ({
      ...hazard,
      position: {
        x: clamp(
          hazard.position.x * scaleX,
          hazard.radius,
          arena.width - hazard.radius
        ),
        y: clamp(
          hazard.position.y * scaleY,
          hazard.radius,
          arena.height - hazard.radius
        )
      }
    })),
    orb: {
      ...world.orb,
      position: {
        x: clamp(
          world.orb.position.x * scaleX,
          world.orb.radius,
          arena.width - world.orb.radius
        ),
        y: clamp(
          world.orb.position.y * scaleY,
          world.orb.radius,
          arena.height - world.orb.radius
        )
      }
    },
    player: {
      ...world.player,
      position: {
        x: clamp(
          world.player.position.x * scaleX,
          world.player.radius,
          arena.width - world.player.radius
        ),
        y: clamp(
          world.player.position.y * scaleY,
          world.player.radius,
          arena.height - world.player.radius
        )
      }
    }
  };
}

export function updateWorld(
  world: GameWorld,
  input: GameInput,
  deltaSeconds: number
): GameWorld {
  if (world.gameOver) {
    return world;
  }

  const targetHazards = Math.min(7, 2 + Math.floor(world.score / 3));
  const nextDifficulty = 1 + world.score * 0.15 + world.time * 0.012;
  const boostActive = input.boost && world.boostEnergy > 8;
  const moveMagnitude = Math.min(1, Math.hypot(input.move.x, input.move.y));
  const speed = (240 + nextDifficulty * 12) * (boostActive ? 1.55 : 1);
  const velocity = {
    x: input.move.x * speed,
    y: input.move.y * speed
  };

  let nextWorld: GameWorld = {
    ...world,
    boostEnergy: clamp(
      world.boostEnergy + (boostActive ? -42 : 28) * deltaSeconds,
      0,
      100
    ),
    difficulty: nextDifficulty,
    event: "none",
    player: {
      ...world.player,
      invulnerableFor: Math.max(0, world.player.invulnerableFor - deltaSeconds),
      position: {
        x: clamp(
          world.player.position.x + velocity.x * deltaSeconds,
          world.player.radius,
          world.arena.width - world.player.radius
        ),
        y: clamp(
          world.player.position.y + velocity.y * deltaSeconds,
          world.player.radius,
          world.arena.height - world.player.radius
        )
      }
    },
    pulseCooldown: Math.max(0, world.pulseCooldown - deltaSeconds),
    time: world.time + deltaSeconds
  };

  nextWorld = {
    ...nextWorld,
    hazards: nextWorld.hazards.map((hazard) => {
      let nextX = hazard.position.x + hazard.velocity.x * deltaSeconds;
      let nextY = hazard.position.y + hazard.velocity.y * deltaSeconds;
      let velocityX = hazard.velocity.x;
      let velocityY = hazard.velocity.y;

      if (
        nextX <= hazard.radius ||
        nextX >= nextWorld.arena.width - hazard.radius
      ) {
        velocityX *= -1;
        nextX = clamp(nextX, hazard.radius, nextWorld.arena.width - hazard.radius);
      }

      if (
        nextY <= hazard.radius ||
        nextY >= nextWorld.arena.height - hazard.radius
      ) {
        velocityY *= -1;
        nextY = clamp(
          nextY,
          hazard.radius,
          nextWorld.arena.height - hazard.radius
        );
      }

      return {
        ...hazard,
        position: { x: nextX, y: nextY },
        velocity: { x: velocityX, y: velocityY }
      };
    })
  };

  if (input.pulse && nextWorld.pulseCooldown <= 0) {
    const beforeCount = nextWorld.hazards.length;
    const clearRadius = 132;

    nextWorld = {
      ...nextWorld,
      hazards: nextWorld.hazards.filter(
        (hazard) =>
          distance(hazard.position, nextWorld.player.position) > clearRadius
      ),
      pulseCooldown: 4.2
    };

    if (beforeCount !== nextWorld.hazards.length) {
      nextWorld = stampEvent(nextWorld, "pulse");
    }
  }

  while (nextWorld.hazards.length < targetHazards) {
    nextWorld = {
      ...nextWorld,
      hazards: [
        ...nextWorld.hazards,
        createHazard(
          nextWorld.arena,
          nextWorld.hazards.length,
          nextWorld.player.position
        )
      ]
    };
  }

  if (
    distance(nextWorld.player.position, nextWorld.orb.position) <=
    nextWorld.player.radius + nextWorld.orb.radius + moveMagnitude * 6
  ) {
    nextWorld = stampEvent(
      {
        ...nextWorld,
        orb: createOrb(nextWorld.arena, nextWorld.player.position),
        score: nextWorld.score + 1
      },
      "collect"
    );
  }

  if (nextWorld.player.invulnerableFor <= 0) {
    const collided = nextWorld.hazards.some(
      (hazard) =>
        distance(hazard.position, nextWorld.player.position) <=
        hazard.radius + nextWorld.player.radius
    );

    if (collided) {
      const remainingHealth = nextWorld.player.health - 1;
      const gameOver = remainingHealth <= 0;

      nextWorld = stampEvent(
        {
          ...nextWorld,
          gameOver,
          player: {
            ...nextWorld.player,
            health: Math.max(remainingHealth, 0),
            invulnerableFor: gameOver ? 0 : 1.2,
            position: {
              x: nextWorld.arena.width / 2,
              y: nextWorld.arena.height / 2
            }
          },
          score: Math.max(0, nextWorld.score - 1)
        },
        gameOver ? "game-over" : "hit"
      );
    }
  }

  return nextWorld;
}

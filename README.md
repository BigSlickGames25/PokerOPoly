# PokerOpoly

PokerOpoly is now an Expo/React Native starter that keeps the shared Big Slick
hub shell while mounting a 4-player online 3D board-game runtime on the game
route.

## Included

- File-based native navigation with the existing hub/auth/profile/wallet shell.
- Cross-platform 3D rendering with React Three Fiber on web and native.
- A 4-seat board-session model with local mock realtime for active development.
- A hub transport path that can replace the mock controller once backend socket
  support is ready.
- Shared platform adapters for auth, profile, wallet, rewards, transactions,
  analytics, and product selection.
- Safe-area aware layout, orientation preferences, haptics, and keep-awake.
- Static web export support for S3 + CloudFront deployments.

## Stack

- Expo SDK 54
- React Native 0.81
- Expo Router
- TypeScript
- React Three Fiber
- Three.js
- Expo GL
- Async Storage

## Project layout

- `app/`: navigation routes and route entry points.
- `src/screens/`: shell screens for home, launcher, hub, settings, and help.
- `src/game/`: gameplay route, 3D scene components, and board-session logic.
- `src/game/board/`: board definitions and shared gameplay types.
- `src/platform/`: shared hub auth, APIs, catalog, and types.
- `assets/`: add models, textures, audio, and branding assets here.
- `infra/`: deployment helpers such as CloudFront rewrites.

## Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
npm run web
npm run check
```

The default board transport mode is `mock`. That means the 3D board, seat
state, and turn flow can be developed without waiting for the realtime backend.

When the backend socket layer is ready, switch to hub mode in `.env`:

```bash
EXPO_PUBLIC_BOARD_TRANSPORT_MODE=hub
EXPO_PUBLIC_BOARD_SOCKET_PATH=/ws/board-game
```

## Env

Copy `.env.example` to `.env`.

Set:

- `EXPO_PUBLIC_APP_ENV=staging`
- `EXPO_PUBLIC_API_BASE_URL=https://staging.21-holdem.com`
- `EXPO_PUBLIC_SOCKET_BASE_URL=wss://staging.21-holdem.com`
- `EXPO_PUBLIC_BOARD_TRANSPORT_MODE=mock`
- `EXPO_PUBLIC_BOARD_SOCKET_PATH=/ws/board-game`

## 3D asset pipeline

- `metro.config.js` is configured for `.glb`, `.gltf`, `.bin`, and `.ktx2`.
- Put production board pieces, pawns, props, and environment assets under
  `assets/models/`.
- Put shared textures under `assets/textures/`.
- The current scene uses procedural meshes as development placeholders so the
  runtime stays usable before final art arrives.

## Backend shape

The frontend still assumes the shared hub backend owns:

- auth and session bootstrap
- profile and player settings
- wallet, rewards, and transactions
- analytics and product routing

Board-game-specific realtime should sit on top as a product adapter, not inside
the shared platform core.

## Replace points

1. Replace the mock table rules in `src/game/board-mock-session.ts`.
2. Replace the current scene meshes in `src/game/BoardSceneContent.tsx`.
3. Add final board assets and loaders once art is ready.
4. Wire the hub transport to the real backend room/lobby protocol.
5. Update branding in `app.config.ts`, assets, and copy.

## Deploy web to S3 + CloudFront

Build the static export:

```bash
npm run export:web
```

That outputs to `web-build/`.

Deployment shape:

1. Upload `web-build/` to S3.
2. Put CloudFront in front of that bucket.
3. Attach `infra/cloudfront/viewer-request-rewrite.js`.
4. Point the frontend domain at CloudFront.
5. Keep the API/socket backend on EC2 or the shared hub host.

## Notes

- Native gameplay still needs testing on real devices, especially around GPU
  performance and touch behavior.
- The current hub transport is a socket scaffold, not a final protocol.
- Mock mode is the intended default until the backend board adapter is live.

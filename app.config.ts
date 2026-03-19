import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'New Game 06',
  slug: 'new-game-06',
  scheme: 'newgame06',
  version: "1.0.0",
  orientation: "default",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  jsEngine: "hermes",
  splash: {
    backgroundColor: "#07111f"
  },
  ios: {
    supportsTablet: true,
    requireFullScreen: true,
    bundleIdentifier: 'com.bigslickgames.newgame06'
  },
  android: {
    package: 'com.bigslickgames.newgame06',
    adaptiveIcon: {
      backgroundColor: "#07111f"
    }
  },
  web: {
    bundler: "metro",
    output: "static"
  },
  plugins: [
    "expo-router",
    [
      "expo-screen-orientation",
      {
        initialOrientation: "DEFAULT"
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    ...(config.extra ?? {}),
    router: {
      ...((config.extra as { router?: Record<string, unknown> } | undefined)
        ?.router ?? {}),
      root: "app"
    }
  }
});

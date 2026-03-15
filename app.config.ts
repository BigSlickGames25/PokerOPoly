import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PokerOpoly',
  slug: 'pokeropoly',
  scheme: 'pokeropoly',
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
    bundleIdentifier: 'com.bigslickgames.pokeropoly'
  },
  android: {
    package: 'com.bigslickgames.pokeropoly',
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

function normalizeUrl(
  value: string | undefined,
  allowedProtocols: readonly string[]
) {
  if (!value) {
    return null;
  }

  const candidate = value.trim();

  if (!candidate) {
    return null;
  }

  try {
    const url = new URL(candidate);

    if (!allowedProtocols.includes(url.protocol)) {
      return null;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function getHostLabel(value: string | null) {
  if (!value) {
    return "Not configured";
  }

  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}

const appEnv = process.env.EXPO_PUBLIC_APP_ENV?.trim() || "development";
const apiBaseUrl = normalizeUrl(process.env.EXPO_PUBLIC_API_BASE_URL, [
  "http:",
  "https:"
]);
const socketBaseUrl = normalizeUrl(process.env.EXPO_PUBLIC_SOCKET_BASE_URL, [
  "ws:",
  "wss:"
]);
const boardTransportMode =
  process.env.EXPO_PUBLIC_BOARD_TRANSPORT_MODE?.trim().toLowerCase() === "hub"
    ? "hub"
    : "mock";
const boardSocketPath =
  process.env.EXPO_PUBLIC_BOARD_SOCKET_PATH?.trim() || "/ws/board-game";

export const runtimeConfig = {
  appEnv,
  apiBaseUrl,
  apiHostLabel: getHostLabel(apiBaseUrl),
  backendLabel: apiBaseUrl ? `${appEnv}: ${getHostLabel(apiBaseUrl)}` : "Not configured",
  boardSocketPath,
  boardTransportLabel:
    boardTransportMode === "hub"
      ? socketBaseUrl
        ? `Hub socket: ${getHostLabel(socketBaseUrl)}`
        : "Hub socket not configured"
      : "Local mock realtime",
  boardTransportMode,
  socketBaseUrl
};

export function buildApiUrl(path: string) {
  if (!apiBaseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured.");
  }

  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildSocketUrl(
  path: string,
  query?: Record<string, boolean | number | string | null | undefined>
) {
  if (!socketBaseUrl) {
    throw new Error("EXPO_PUBLIC_SOCKET_BASE_URL is not configured.");
  }

  const url = new URL(path.startsWith("/") ? path : `/${path}`, `${socketBaseUrl}/`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

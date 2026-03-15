import { requestHubApi } from "./client";
import type {
  HubBoardGameActionPayload,
  HubBoardGameLobby,
  HubBoardGameSnapshotEnvelope,
  HubCreateBoardGameLobbyPayload,
  HubJoinBoardGameLobbyPayload
} from "../types";

export const hubBoardGameApi = {
  async createLobby(token: string, payload: HubCreateBoardGameLobbyPayload) {
    return requestHubApi<HubBoardGameLobby>({
      body: payload,
      method: "POST",
      path: "/board-game/lobbies",
      token
    });
  },
  async getSnapshot(token: string, matchId: string) {
    return requestHubApi<HubBoardGameSnapshotEnvelope>({
      method: "GET",
      path: `/board-game/matches/${matchId}`,
      token
    });
  },
  async joinLobby(token: string, payload: HubJoinBoardGameLobbyPayload) {
    return requestHubApi<HubBoardGameSnapshotEnvelope>({
      body: payload,
      method: "POST",
      path: "/board-game/lobbies/join",
      token
    });
  },
  async listLobbies(token: string) {
    return requestHubApi<HubBoardGameLobby[]>({
      method: "GET",
      path: "/board-game/lobbies",
      token
    });
  },
  async sendAction(token: string, payload: HubBoardGameActionPayload) {
    return requestHubApi<HubBoardGameSnapshotEnvelope>({
      body: payload,
      method: "POST",
      path: "/board-game/action",
      token
    });
  }
};

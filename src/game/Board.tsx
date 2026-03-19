import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GameState, Card, PokeropolyPlayer } from "./types";

interface BoardProps {
  state: GameState;
}

export function Board({ state }: BoardProps) {
  // Render cards in a circle (simple layout)
  const { board, cards, players } = state;
  const boardSize = board.length;
  const radius = 140;
  const center = { x: 160, y: 160 };

  return (
    <View style={styles.container}>
      {/* Render cards as board spaces */}
      {board.map((space, i) => {
        const angle = (2 * Math.PI * i) / boardSize;
        const x = center.x + radius * Math.cos(angle) - 24;
        const y = center.y + radius * Math.sin(angle) - 24;
        const card = cards.find((c) => c.id === space.cardId);
        const owner = card?.ownerId
          ? players.find((p) => p.id === card.ownerId)
          : null;
        return (
          <View
            key={space.cardId}
            style={[styles.card, { left: x, top: y, backgroundColor: owner ? "#ffe0b2" : "#fff" }]}
          >
            <Text style={styles.cardText}>{card?.rank}{card?.suit[0].toUpperCase()}</Text>
            {owner && <Text style={styles.ownerText}>{owner.name}</Text>}
          </View>
        );
      })}
      {/* Render player tokens */}
      {players.map((player, idx) => {
        const pos = board[player.position];
        const angle = (2 * Math.PI * pos.index) / boardSize;
        const x = center.x + (radius - 36) * Math.cos(angle) - 12;
        const y = center.y + (radius - 36) * Math.sin(angle) - 12;
        return (
          <View key={player.id} style={[styles.token, { left: x, top: y, backgroundColor: tokenColors[idx % tokenColors.length] }]}/>
        );
      })}
    </View>
  );
}

const tokenColors = ["#e53935", "#3949ab", "#43a047", "#fbc02d"];

const styles = StyleSheet.create({
  container: {
    width: 320,
    height: 320,
    backgroundColor: "#e3f2fd",
    borderRadius: 16,
    alignSelf: "center",
    marginVertical: 24,
  },
  card: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#90caf9",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  cardText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  ownerText: {
    fontSize: 10,
    color: "#888",
  },
  token: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 3,
  },
});

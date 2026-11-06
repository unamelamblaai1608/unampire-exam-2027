
import { adminDb } from "./firebase-admin";

export async function testDatabaseConnection() {
  const snapshot = await adminDb
    .collection("games")
    .limit(1)
    .get();

  return {
    connected: true,
    existingGames: snapshot.size,
  };
}

export async function createGameDocument(
  gameId: string,
  gameData: Record<string, unknown>
) {
  await adminDb.collection("games").doc(gameId).set({
    ...gameData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

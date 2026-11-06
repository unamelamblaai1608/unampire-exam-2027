import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";

export async function testDatabaseConnection() {
  const snapshot = await adminDb.collection("games").limit(1).get();
  return { connected: true, existingGames: snapshot.size };
}

export async function createGameDocument(
  gameId: string,
  gameData: Record<string, unknown>
) {
  await adminDb.collection("games").doc(gameId).set({
    ...gameData,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export type BattleRecord = {
  id: string;
  round: number;
  attacker: string;
  defender: string;
  attackerDice: number[];
  defenderDice: number[];
  attackerLosses: number;
  defenderLosses: number;
  outcome: string;
  commentary: string;
};

export type GameStatus = "in_progress" | "finished" | "abandoned";

export type GameDocumentData = {
  playerCountry: string;
  participants: string[];
  currentTurn: string;
  turnIndex: number;
  round: number;
  status: GameStatus;
  winner: string | null;
  turnOrder: string[];
  attackUsed: boolean;
  countries: {
    name: string;
    owner: string;
    troops: number;
    originalTroops: number;
    population: number;
    alive: boolean;
  }[];
  log: { id: number; title: string; detail: string; kind: string }[];
  battleHistory: BattleRecord[];
  nextLogId: number;
};

// Every game belongs to the Clerk user who created it. Admin SDK writes are
// server-only; the API route checks the authenticated user before calling this.
export async function saveGameForUser(
  gameId: string,
  userId: string,
  data: GameDocumentData
): Promise<"saved" | "forbidden"> {
  const gameRef = adminDb.collection("games").doc(gameId);
  const userRef = adminDb.collection("users").doc(userId);

  const result = await adminDb.runTransaction(async (tx) => {
    const [gameSnap, userSnap] = await Promise.all([
      tx.get(gameRef),
      tx.get(userRef),
    ]);

    if (gameSnap.exists && gameSnap.data()?.ownerId !== userId) {
      return "forbidden" as const;
    }

    const now = FieldValue.serverTimestamp();
    tx.set(gameRef, {
      ...data,
      ownerId: userId,
      createdAt: gameSnap.exists
        ? gameSnap.data()?.createdAt ?? now
        : now,
      updatedAt: now,
    }, { merge: true });

    tx.set(userRef, {
      userId,
      lastGameId: gameId,
      gamesCreated: userSnap.exists
        ? (userSnap.data()?.gamesCreated ?? 0)
        : 1,
      createdAt: userSnap.exists
        ? userSnap.data()?.createdAt ?? now
        : now,
      updatedAt: now,
    }, { merge: true });

    return "saved" as const;
  });

  if (result === "forbidden") return result;

  // Store each volley separately. Deterministic IDs make repeated autosaves safe.
  const batch = adminDb.batch();
  for (const battle of data.battleHistory) {
    const battleRef = adminDb.collection("battles").doc(`${gameId}_${battle.id}`);
    batch.set(battleRef, {
      ...battle,
      gameId,
      ownerId: userId,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  if (data.battleHistory.length > 0) await batch.commit();

  return "saved";
}

export async function loadLatestGameForUser(userId: string) {
  const snapshot = await adminDb
    .collection("games")
    .where("ownerId", "==", userId)
    .limit(50)
    .get();

  const games = snapshot.docs
    .filter((doc) => doc.data().status === "in_progress")
    .sort((a, b) =>
      (b.data().updatedAt?.toMillis?.() ?? 0) -
      (a.data().updatedAt?.toMillis?.() ?? 0)
    );

  if (games.length === 0) return null;
  return { id: games[0].id, ...games[0].data() } as { id: string } & GameDocumentData;
}

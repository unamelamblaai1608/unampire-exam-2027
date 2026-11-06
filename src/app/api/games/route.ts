import { auth } from "@clerk/nextjs/server";
import {
  loadLatestGameForUser,
  saveGameForUser,
  type BattleRecord,
  type GameDocumentData,
  type GameStatus,
} from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const str = (value: unknown, max = 500) =>
  typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
const int = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null;

function parseGame(raw: any, requestedStatus?: unknown): GameDocumentData | null {
  if (!raw || typeof raw !== "object") return null;

  const playerCountry = str(raw.playerCountry);
  const round = int(raw.round, 1, 100000);
  const turnIndex = int(raw.turnIndex, 0, 9);
  const nextLogId = int(raw.nextLogId, 1, 10000000);

  if (!playerCountry || round === null || turnIndex === null || nextLogId === null) {
    return null;
  }
  if (!Array.isArray(raw.countries) || raw.countries.length !== 10) return null;
  if (!Array.isArray(raw.turnOrder) || raw.turnOrder.length !== 10) return null;

  const countries: GameDocumentData["countries"] = [];
  for (const country of raw.countries) {
    const name = str(country?.name);
    const owner = str(country?.owner);
    const troops = int(country?.troops, 0, 100000);
    const originalTroops = int(country?.originalTroops, 1, 100000);
    const population = int(country?.population, 1, 3000000000);
    if (
      !name || !owner || troops === null || originalTroops === null ||
      population === null || typeof country.alive !== "boolean"
    ) return null;
    countries.push({ name, owner, troops, originalTroops, population, alive: country.alive });
  }

  const names = countries.map((country) => country.name);
  const turnOrder = raw.turnOrder.map((name: unknown) => str(name));
  if (turnOrder.some((name: string | null) => !name)) return null;
  if (new Set(names).size !== 10 || new Set(turnOrder).size !== 10) return null;
  if (names.some((name) => !turnOrder.includes(name))) return null;
  if (!names.includes(playerCountry) || turnIndex >= turnOrder.length) return null;

  const log: GameDocumentData["log"] = [];
  if (Array.isArray(raw.log)) {
    for (const item of raw.log.slice(0, 80)) {
      const id = int(item?.id, 0, 10000000);
      const title = str(item?.title, 200);
      const detail = typeof item?.detail === "string" ? item.detail.slice(0, 1000) : null;
      const kind = str(item?.kind, 20);
      if (id === null || !title || detail === null || !kind) return null;
      log.push({ id, title, detail, kind });
    }
  }

  const battleHistory: BattleRecord[] = [];
  if (Array.isArray(raw.battleHistory)) {
    for (const battle of raw.battleHistory.slice(-200)) {
      const id = str(battle?.id, 100);
      const attacker = str(battle?.attacker);
      const defender = str(battle?.defender);
      const battleRound = int(battle?.round, 1, 100000);
      const attackerLosses = int(battle?.attackerLosses, 0, 10);
      const defenderLosses = int(battle?.defenderLosses, 0, 10);
      const outcome = str(battle?.outcome, 100);
      const commentary = typeof battle?.commentary === "string"
        ? battle.commentary.slice(0, 1000)
        : null;
      const dice = (values: unknown) =>
        Array.isArray(values) && values.length <= 10 &&
        values.every((die) => int(die, 1, 6) !== null)
          ? values as number[]
          : null;
      const attackerDice = dice(battle?.attackerDice);
      const defenderDice = dice(battle?.defenderDice);
      if (
        !id || !attacker || !defender || battleRound === null ||
        attackerLosses === null || defenderLosses === null || !outcome ||
        commentary === null || !attackerDice || !defenderDice
      ) return null;
      battleHistory.push({
        id, round: battleRound, attacker, defender, attackerDice, defenderDice,
        attackerLosses, defenderLosses, outcome, commentary,
      });
    }
  }

  const winner = raw.winner == null ? null : str(raw.winner);
  if (raw.winner != null && !winner) return null;
  const resolvedStatus: GameStatus =
    requestedStatus === "abandoned" ? "abandoned" : winner ? "finished" : "in_progress";

  return {
    playerCountry,
    participants: names,
    currentTurn: turnOrder[turnIndex] as string,
    turnIndex,
    round,
    status: resolvedStatus,
    winner,
    turnOrder: turnOrder as string[],
    attackUsed: raw.attackUsed === true,
    countries,
    log,
    battleHistory,
    nextLogId,
  };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ saved: false, error: "Sign in to save your game." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const gameId = typeof body?.gameId === "string" && ID_PATTERN.test(body.gameId)
      ? body.gameId
      : null;
    const game = parseGame(body?.game, body?.status);
    if (!gameId || !game) {
      return Response.json({ saved: false, error: "Invalid game data." }, { status: 400 });
    }

    const result = await saveGameForUser(gameId, userId, game);
    if (result === "forbidden") {
      return Response.json({ saved: false, error: "You cannot modify another user's game." }, { status: 403 });
    }
    return Response.json({ saved: true, gameId });
  } catch (error) {
    console.error("Game save error:", error);
    return Response.json({ saved: false, error: "Could not save the game." }, { status: 500 });
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ game: null }, { status: 401 });

  try {
    const saved = await loadLatestGameForUser(userId);
    if (!saved) return Response.json({ game: null });
    return Response.json({
      game: {
        gameId: saved.id,
        playerCountry: saved.playerCountry,
        countries: saved.countries,
        turnOrder: saved.turnOrder,
        turnIndex: saved.turnIndex,
        round: saved.round,
        log: saved.log,
        winner: saved.winner,
        nextLogId: saved.nextLogId,
        attackUsed: saved.attackUsed ?? false,
        battleHistory: saved.battleHistory ?? [],
      },
    });
  } catch (error) {
    console.error("Game load error:", error);
    return Response.json({ game: null, error: "Could not load the game." }, { status: 500 });
  }
}

# UNAMpire

**One world. Ten nations. One empire.**

A playable single-player strategy-game prototype built with Next.js, TypeScript and React. It includes a country-selection screen, a world-map illustration, 10 nations per match, player turns, simulated NPC turns, troop reinforcements, troop transfers, dice-based battles, conquest bonuses, elimination and a browser save.

## Run on Windows

1. Install Node.js (LTS) from https://nodejs.org if it is not already installed.
2. Extract this ZIP.
3. Open the **UNAMpire-Ready** folder in VS Code (the folder containing `package.json`).
4. In VS Code, choose **Terminal → New Terminal**.
5. Run these commands:

```powershell
npm.cmd install
npm.cmd run dev
```

6. Open http://localhost:3001.

The development server uses port `3001` to avoid colliding with a production
server, which uses Next.js's default port `3000`. If a UNAMpire server is
already running, reuse its URL instead of starting another copy. Keep the
terminal that started the server open while playing locally; press `Ctrl + C`
in that terminal when you want to stop it.

## What's included

- New game: choose a country; nine opponents are selected automatically.
- Starting troops are assigned from population tiers.
- Random first player.
- Player attack, skip, transfer and troop-allocation actions.
- Pairwise dice combat, losses, conquest and conquest bonus.
- Two reinforcements per owned country from round two onward.
- NPC turns with a short strategic explanation in the activity log.
- Fast-forward NPC turns.
- Browser save using localStorage; use **Reset game** to start again.
- `public/database/countries.json`: country reference data used by the game.
- `public/database/game-rules.json`: editable rules and population tiers.

## Important database and deployment note

The `public/database` folder is a **JSON seed/reference database file**, included in this project. The playable prototype saves a match in the player's browser (`localStorage`), so it works without a database account. NPC turns are simulated locally and do not require an OpenAI API key.

A JSON file inside a Vercel deployment is not a writable shared database. It cannot safely store multiple players' games or provide shared spectator links. Before submitting a production multiplayer/shared-game version, connect MongoDB Atlas and move game saves/actions to server-side API routes. The `.env.example` file has placeholders for that future database connection and for Clerk authentication.

## Deploy to Vercel

1. Create a GitHub repository and upload the contents of this folder (not the ZIP itself), then import the repository in Vercel using **Add New → Project**. Keep the default Next.js build settings.
2. To enable Clerk sign-in and sign-up, add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` under **Project Settings → Environment Variables** in Vercel. Use the values from your Clerk account; do not commit or upload `.env.local`.
3. Add the configured Clerk sign-in and sign-up URLs and fallback redirect URLs as needed for your Clerk deployment. The local values are in `.env.local`; configure the production domain in Clerk and Vercel rather than copying local-only settings blindly.
4. Deploy. The game stores each campaign in that browser's `localStorage`; it does not require MongoDB, but saves are not shared across browsers or users.

## Game rules in this prototype

- 10 countries take part in a match: the player's choice plus nine random opponents.
- Geography does not restrict attacks.
- A territory must always retain at least one troop.
- An attack uses up to the smaller of the attacker's committed troops and defender's troops in dice.
- Dice are compared pairwise; the higher die wins, and ties cause no loss.
- A battle can be resolved volley by volley. The player may stop between volleys.
- On conquest, the attacker chooses how many troops to move in. The conquest bonus is at least two, or half the conquered country's original starting troop value rounded down.
- No reinforcements in round one. From round two, a player receives two troops per owned country at the start of their turn.
- NPCs are simulated locally and provide an explanation in the activity feed. This is rule-based prototype AI, not a live OpenAI API integration.

## Project structure

```text
UNAMpire-Ready/
  public/database/countries.json
  public/database/game-rules.json
  src/app/globals.css
  src/app/layout.tsx
  src/app/page.tsx
  README.md
  package.json
```

# UNAMpire

**One world. Ten nations. One empire.**

UNAMpire is a single-player geopolitical strategy game built with Next.js 15, React, TypeScript, Clerk authentication and Firebase Firestore.

## Features

- Choose one starting country; nine opponents are selected randomly.
- Starting soldier counts are calculated from population tiers.
- Random first turn and ten-country turn order.
- Player turns and rule-based NPC decisions.
- Pairwise six-sided dice combat, casualties, conquest and troop transfers.
- Two reinforcement troops per owned territory from round two onward.
- NPC fast-forward and a battle/decision chronicle.
- Firestore game saving and restoration for signed-in users.
- Clerk user identity associates each game with its owner.

## Requirements

- Node.js 20 or newer (LTS recommended).
- A Clerk application.
- A Firebase project with Cloud Firestore enabled.
- A Firebase service account with Firestore read/write permission.

## Local setup (Windows / VS Code)

1. Clone this repository and open its root folder in VS Code (the folder containing `package.json`).
2. Open **Terminal → New Terminal**.
3. Install dependencies:

```powershell
npm.cmd install
```

4. Create `.env.local` in the project root and add your own credentials:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_YOUR_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=sk_test_REPLACE_WITH_YOUR_CLERK_SECRET_KEY
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-firebase-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nREPLACE_WITH_YOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

Never commit `.env.local`, private keys, service-account JSON files or secret keys. The repository's `.gitignore` excludes environment files.

5. Start the development server:

```powershell
npm.cmd run dev
```

6. Open http://localhost:3001.

## Firebase setup

1. In Firebase Console, select your project and enable **Firestore Database**.
2. Open Project settings → Service accounts and generate a private key for a server-side service account.
3. Put the project ID, service-account email and private key in the local environment variables above.
4. In Vercel, add all three Firebase variables under **Project → Settings → Environment Variables**. Enable them for Production and redeploy after changing them.
5. Keep Firebase Admin imports on the server only. Never expose the private key to browser code.

The application creates these Firestore collections when it first writes documents:

- `games`: game state, countries, ownership, soldiers, round, turn, status, battle history and ownerId.
- `users`: Clerk user ID and last game reference.
- `battles`: individual battle volleys, dice, casualties, outcome and commentary, linked by gameId.

The `/api/games` API requires a signed-in Clerk user for cloud saves and loads. It checks the owner before allowing an existing game to be updated. Firebase Admin SDK bypasses Firestore Security Rules, so all Admin SDK access must remain server-side and the API ownership check must be preserved.

## Clerk setup

1. Create or open your Clerk application.
2. Copy its publishable key and secret key into the environment variables.
3. Ensure the keys belong to the same Clerk application and environment (both test or both live).
4. Configure your production Vercel domain in Clerk.
5. Configure sign-in and sign-up redirect URLs for `/sign-in` and `/sign-up`.
6. Add the production environment variables in Vercel and redeploy.

## Build and test

```powershell
npm.cmd run build
```

Before submission, test:

1. The deployed home page loads.
2. Registration and sign-in work.
3. A signed-in user can start a game with exactly ten countries.
4. Soldier counts match the population tiers.
5. The player can attack once per turn and see dice, casualties and battle commentary.
6. NPCs make and explain attack/reinforcement decisions.
7. Conquest, reinforcements, transfers, elimination and victory work.
8. A signed-in user's game saves to Firestore and restores after refreshing.
9. A different signed-in user cannot update another user's game.

## Important implementation notes

- NPC behaviour is rule-based game AI, not a live LLM integration.
- Browser storage is retained as a fallback, but it is not a shared cloud database.
- Cloud persistence requires successful Clerk authentication and correctly configured Firebase Admin environment variables.
- Do not describe a feature as verified until it has been tested in the deployed application.

## Project structure

```text
public/database/             Country reference data and game rules
src/app/api/games/           Authenticated Firestore save/load API
src/app/api/db-test/         Development-only database connection test
src/app/game/                Game interface and gameplay logic
src/app/sign-in/             Clerk sign-in page
src/app/sign-up/             Clerk registration page
src/lib/db.ts                Firestore persistence functions
src/lib/firebase-admin.ts    Server-side Firebase Admin connection
src/components/              Shared interface components
```

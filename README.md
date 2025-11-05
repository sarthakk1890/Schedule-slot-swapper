## Schedule Slot Swapper


### Design highlights
- **Swap workflow safety**: On swap response, both slots must still be SWAPPABLE; otherwise the request is marked REJECTED and a 400 is returned. On acceptance, owners are atomically swapped in a transaction and both slots become BUSY.
- **Optimistic request creation**: Creating a swap request does not lock slots. Multiple users can request the same slot; only one acceptance will succeed.
- **Real‑time UX**: Socket rooms per user (`user:{id}`) so only the right user receives request/response notifications, plus broadcast events for global lists.

## Getting started

### Environment variables

Backend (`server`): create `server/.env` or export envs
- `MONGO_URI` (e.g. `mongodb://localhost:27017/slot_swapper`)
- `JWT_SECRET` (any strong string)

Frontend (`client`): create `client/.env`
- `VITE_API_URL` (e.g. `http://localhost:5000/api`)

(Add .env files before moving forward)

### Run locally (without Docker)
1) Install deps
```bash
cd server && npm install
cd ../client && npm install
```
2) Start MongoDB (if not already running) or use MongoDB Atlas

3) Start API
```bash
cd server
npm run dev
```
4) Start client
```bash
cd ../client
npm run dev
```
5) Open the app: `http://localhost:5173`

### Run with Docker (recommended quick start)
From the repo root:
```bash
docker compose up --build
```
- Client: `http://localhost:5173`
- API: `http://localhost:5000`

### Run backend API tests (Cypress API e2e)
I used Cypress for API‑level tests around the swap‑response logic.

```bash
#Terminal 1
cd server
MONGO_URI="mongodb://localhost:27017/slot_swapper_test" JWT_SECRET="your_secret" npm run dev
#Terminal 2
cd server
npm run cypress:run
```

## API Endpoints

Base URL: backend server (e.g. `http://localhost:5000`), all application endpoints are under `/api`.

### Auth
- POST `/api/auth/signup` — body: `{ name, email, password }` → `{ token, user }`
- POST `/api/auth/login` — body: `{ email, password }` → `{ token, user }`

Use `Authorization: Bearer <token>` for all protected routes below.

### Events
- POST `/api/events` — body: `{ title, startTime, endTime }` → `Event`
- GET `/api/events/me` — list current user’s events
- PUT `/api/events/:id` — update fields (e.g., `status: "SWAPPABLE" | "BUSY"`)
- DELETE `/api/events/:id` — remove an event

### Swaps
- GET `/api/swappable-slots` — all `SWAPPABLE` events not owned by the caller
- POST `/api/swap-request` — body: `{ mySlotId, theirSlotId }` → creates `SwapRequest (PENDING)`
- POST `/api/swap-response/:requestId` — body: `{ accept: boolean }`
  - Accept: swaps event owners within a transaction, sets both to `BUSY`, returns populated `SwapRequest (ACCEPTED)`
  - Reject or stale slots: marks request `REJECTED` and returns 400 on stale
- GET `/api/swap-requests/all` — all swap requests
- GET `/api/swap-requests/incoming` — requests where `toUser` is the caller
- GET `/api/swap-requests/outgoing` — requests where `fromUser` is the caller

### Socket events (selected)
- `swap-request-received` — to recipient room on request creation
- `swap-request-accepted` / `swap-request-rejected` — to sender
- `swap-completed` — to both users on acceptance
- `new-swappable-slot`, `slot-no-longer-swappable` — global updates

## Assumptions
- A slot can receive multiple swap requests concurrently; the first successful acceptance wins.
- Only recipients can respond to swap requests; senders cannot self‑accept.


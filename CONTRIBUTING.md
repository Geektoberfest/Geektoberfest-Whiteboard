# Contributing to the Multi-User Collaborative Whiteboard

Thanks for contributing to this Geekstober project. The app provides authenticated, room-based drawing with live Socket.IO updates, participant presence, chat, and MongoDB board snapshots. This repository includes eight deliberately seeded defects so contributors can work on focused, reproducible fixes. Real-time correctness, maintainable changes, authorization, and room isolation matter throughout.

## Get set up

The repository is [Vansh-Maindiratta/MultiUser-board](https://github.com/Vansh-Maindiratta/MultiUser-board). Fork it on GitHub, then:

```bash
git clone https://github.com/<your-user>/MultiUser-board.git
cd MultiUser-board
git remote add upstream https://github.com/Vansh-Maindiratta/MultiUser-board.git
```

Install and configure the backend in one terminal:

```bash
cd backend
npm ci
cp .env.example .env
```

Edit `backend/.env`: set `MONGODB_URI` to a local MongoDB or Atlas connection string; replace `JWT_SECRET` with a long random secret. `CLIENT_URL` should be the browser origin (locally, `http://localhost:5173`). `PORT` defaults to `5000`; `JWT_EXPIRES_IN` defaults to `7d`; `NODE_ENV` defaults to `development`. Do not share or commit this file.

Start the server:

```bash
npm run dev
```

In a second terminal from the repository root, install and start the frontend:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

The sample Vite values target `http://localhost:5000/api` for REST and `http://localhost:5000` for Socket.IO. Vite requires both `VITE_API_URL` and `VITE_SOCKET_URL`, including for a production build.

Run checks from the corresponding package directory:

```bash
# Backend tests (MongoDB integration suites need a reachable MongoDB instance)
cd backend
npm test

# Frontend production build
cd ../frontend
npm run build
```

There is no configured frontend test or lint command. Run the backend and frontend concurrently for browser testing. Register two test accounts in separate browser profiles, create a public room, and join it from both. Keep the room and its content disposable and non-sensitive.

## Seeded issue catalogue

These are source-level contribution prompts, not proof of published or assigned GitHub issues. Before starting, check the repository's issue tracker and pull requests for duplicates and follow the Geekstober organizers' actual issue-claiming process. Claiming may depend on the event's rules; no issue is claimed by this catalogue.

### WB-01 — Long pen strokes lose their later points

**Difficulty:** Intermediate
**Category:** Drawing synchronization and element validation
**Status:** Intentionally introduced — awaiting contributor fix
**Affected files:** `backend/src/utils/elements.js`; `backend/src/sockets/boardHandlers.js`

**Description:** The server sanitizer retains at most 500 points from a pen element. The browser sends a completed pen stroke as one element, so any points after that threshold are discarded before the server broadcasts or persists it.

**Prerequisites:** Backend and frontend running; two signed-in clients in the same public test room.

**Steps to reproduce:**
1. Draw one continuous, slow, looping freehand line long enough to generate more than 500 points.
2. Compare the sender's stroke with the second client's copy, then reload or rejoin the room.
3. Observe that the later portion is absent on both the live peer and the restored board.

**Example scenario:** A long pen element whose `points` array contains 501 or more valid coordinates.

**Expected behavior:** The application preserves the full supported stroke or safely chunks it without losing points; all same-room clients see the same complete operation.

**Actual behavior:** `sanitizeElement` slices the submitted points array to 500 before broadcast and persistence.

**Acceptance criteria:**
- [ ] Long strokes preserve their intended path for sender, collaborators, and later joiners.
- [ ] Existing element validation limits on coordinates, text, and other fields remain effective.
- [ ] A focused regression test covers a stroke beyond the current limit.
- [ ] Relevant existing checks pass.

**Suggested regression test:** Sanitize or submit a pen element with more than 500 distinct coordinates and verify the supported path is not silently truncated.

**Scope boundaries:** Keep the current element payload contract and supported tools; do not rewrite the canvas or weaken server validation.

**Collaboration considerations:** Board updates remain authenticated and room-scoped. Do not increase payload limits without considering memory and transport costs.

### WB-02 — Presence overflow count is one too high

**Difficulty:** Good first issue
**Category:** Participant presence
**Status:** Intentionally introduced — awaiting contributor fix
**Affected file:** `frontend/src/components/whiteboard/PresenceBar.jsx`

**Description:** When more than six participants are present, the avatar row displays a `+N more` label. Its arithmetic counts one extra participant.

**Prerequisites:** Frontend/backend running; seven or more authorized browser sessions joined to one public test room.

**Steps to reproduce:**
1. Join the same room with seven distinct signed-in users.
2. Inspect the participant avatars and overflow label in the room header.
3. Compare the label with the roster/number of joined accounts.

**Example scenario:** Seven participants show six avatars and `+2 more`, although only one participant is omitted.

**Expected behavior:** The overflow label equals the number of participants not represented by visible avatars.

**Actual behavior:** `PresenceBar` renders `participants.length - 5` while it renders six avatars.

**Acceptance criteria:**
- [ ] Overflow count is correct at seven and at larger room sizes.
- [ ] Zero through six participants render without an overflow label.
- [ ] The existing participant data and room membership behavior are unchanged.
- [ ] Add a focused component or utility regression test if the frontend test setup is introduced.

**Suggested regression test:** Render or exercise the count calculation with participant lists of lengths 6, 7, and 9; expected overflow values are none, 1, and 3.

**Scope boundaries:** Change only the presence display calculation and any focused coverage; do not change server presence events.

**Collaboration considerations:** Presence data is provided by the authenticated room roster. Do not synthesize users or alter room membership.

### WB-03 — Sticky note fill ignores the sticky color

**Difficulty:** Good first issue
**Category:** Drawing tool configuration
**Status:** Intentionally introduced — awaiting contributor fix
**Affected file:** `frontend/src/utils/elements.js`

**Description:** A newly created sticky note uses the selected stroke color as its fill, instead of the separate sticky-note color in the current style configuration.

**Prerequisites:** Open a room. The initial style has a sticky fill color separate from the toolbar's selectable stroke colors.

**Steps to reproduce:**
1. Select a bright stroke color in the toolbar.
2. Choose the Sticky note tool and click the canvas.
3. Observe the note fill; ask a collaborator to confirm the same color arrives over Socket.IO.

**Example scenario:** Select red, then create a sticky note. The note is filled red rather than the current `style.stickyColor`.

**Expected behavior:** The note fill comes from `style.stickyColor` (initialized from `STICKY_COLORS[0]`); stroke color remains available to tools that use it.

**Actual behavior:** `createElement` assigns `style.color` to a sticky note's `fill`.

**Acceptance criteria:**
- [ ] Creating a sticky note uses the chosen sticky fill.
- [ ] Changing pen/shape stroke color does not unexpectedly change sticky fill.
- [ ] The selected fill is preserved when collaborators receive and reload the note.
- [ ] Focused coverage verifies the created sticky element's fill.

**Suggested regression test:** Call `createElement('sticky', point, { color: '#ef4444', stickyColor: '#bfdbfe', strokeWidth: 4 })` and assert the fill is `#bfdbfe`.

**Scope boundaries:** Preserve the existing sticky dimensions, text editor, element format, and server sanitizer.

**Collaboration considerations:** Verify the resulting fill matches for all room members and persists in the board snapshot.

### WB-04 — Undo history stops after one action

**Difficulty:** Intermediate
**Category:** Drawing history
**Status:** Intentionally introduced — awaiting contributor fix
**Affected file:** `frontend/src/hooks/useBoardRoom.js`

**Description:** The local history retains only one past snapshot. After two or more board changes, undo can step back just one operation even though the contributor may expect the documented history depth.

**Prerequisites:** Open a room with at least two editable operations.

**Steps to reproduce:**
1. Draw or create two separate objects.
2. Press Undo twice, or use the Undo toolbar button twice.
3. Observe that only the most recent operation can be undone.

**Example scenario:** After adding objects A and B, the first undo removes B; the second undo cannot remove A.

**Expected behavior:** History supports multiple undo steps up to its intended bounded capacity and broadcasts each resulting board diff to collaborators.

**Actual behavior:** `HISTORY_LIMIT` is `1`, and history arrays are sliced to this limit.

**Acceptance criteria:**
- [ ] Multiple consecutive local changes can be undone and redone up to a documented limit.
- [ ] Undo/redo diffs continue to synchronize to the current room.
- [ ] History remains bounded and is not represented as durable server-side history.
- [ ] Add coverage for multiple undo and redo operations.

**Suggested regression test:** Exercise two distinct upserts, undo twice, redo twice, and assert each snapshot plus emitted diff.

**Scope boundaries:** Do not redesign collaborative conflict resolution or claim that undo is a shared server history.

**Collaboration considerations:** Confirm the authored undo/redo diff reaches same-room clients only and does not affect other rooms.

### WB-05 — The first saved drawing disappears when a room is reopened

**Difficulty:** Good first issue
**Category:** Board loading and persistence feedback
**Status:** Intentionally introduced — awaiting contributor fix
**Affected files:** `backend/src/services/boardService.js`; `frontend/src/hooks/useBoardRoom.js`

**Description:** When a room has no active in-memory board, `readBoard` drops the first element from any MongoDB snapshot before returning it. The original snapshot remains stored, but the first drawing is absent for clients that load the saved board.

**Prerequisites:** Backend connected to a dedicated test MongoDB database; use a disposable room with at least one saved element.

**Steps to reproduce:**
1. Join a test room and create two distinct objects so the room snapshot is persisted.
2. Leave until the active in-memory board is released.
3. Rejoin the room and compare its objects with the board before leaving.

**Example scenario:** `Board.findOne({ room })` returns `[elementA, elementB]`, but `readBoard` returns only `[elementB]`.

**Expected behavior:** Every element in the saved snapshot is returned in the same order; later joiners see the complete board.

**Actual behavior:** `readBoard` returns `stored.elements.slice(1)`, silently omitting the first saved drawing.

**Acceptance criteria:**
- [ ] All saved elements restore in their original order.
- [ ] Empty snapshots still load as empty without an error.
- [ ] No saved document or element is deleted or rewritten to resolve the notice.
- [ ] Add coverage for both empty and non-empty persisted snapshots.

**Suggested regression test:** With an isolated database, save two uniquely identified elements, release active state, read the board, and assert both elements and their ordering; also cover an empty snapshot.

**Scope boundaries:** Do not change database schema, clear-board semantics, or MongoDB records outside isolated tests.

**Collaboration considerations:** Use a test database and disposable room. Preserve room-scoped persistence and unrelated board data.

### WB-06 — Socket.IO does not retry after a disconnect

**Difficulty:** Intermediate
**Category:** Socket.IO lifecycle and reconnect
**Status:** Intentionally introduced — awaiting contributor fix
**Affected files:** `frontend/src/services/socket.js`; `frontend/src/hooks/useBoardRoom.js`

**Description:** The client connection explicitly disables Socket.IO reconnection. A transient network drop therefore leaves the room disconnected until the page is reloaded or the connection is recreated.

**Prerequisites:** Two clients in the same authorized test room; browser developer tools or a controllable network connection.

**Steps to reproduce:**
1. Open a room and confirm drawing sync works.
2. Temporarily disable the browser network or stop and restart the backend.
3. Restore connectivity and wait without refreshing the page.
4. Observe the reconnecting indicator and attempt a drawing or chat send.

**Example scenario:** Network comes back after a brief outage, but the Socket.IO client does not initiate another handshake.

**Expected behavior:** The client retries a connection, reauthenticates using its existing token, rejoins only the authorized room, refreshes board/presence state, and avoids duplicate listeners or events.

**Actual behavior:** `getSocket` calls `io` with `reconnection: false`.

**Acceptance criteria:**
- [ ] A recoverable disconnect automatically retries according to a bounded/backoff policy.
- [ ] Reconnection reuses the existing authenticated handshake and server room authorization.
- [ ] The room board and participant list refresh after a successful rejoin.
- [ ] Repeated reconnects do not duplicate drawing, presence, or chat handlers.
- [ ] Add a lifecycle regression test or documented two-session browser check.

**Suggested regression test:** Disconnect and reconnect a test socket, verify `room:join` is acknowledged again, and assert one copy of a subsequent board event is handled.

**Scope boundaries:** Never make socket authentication optional or let the browser choose an unchecked room subscription.

**Collaboration considerations:** Rejoin must pass the same server-side membership check as the initial join; test room isolation during recovery.

### WB-07 — Retina displays use scaled pointer coordinates

**Difficulty:** Intermediate
**Category:** Canvas rendering and pointer coordinates
**Status:** Intentionally introduced — awaiting contributor fix
**Affected file:** `frontend/src/components/whiteboard/Whiteboard.jsx`

**Description:** Pointer coordinates are multiplied by device pixel ratio even though drawing geometry and the canvas event rectangle use CSS pixels. On a high-density display, strokes and click locations are displaced and scaled relative to the visible canvas.

**Prerequisites:** Use a browser/device with `devicePixelRatio` greater than 1, or emulate a high-density display in browser developer tools.

**Steps to reproduce:**
1. Open a room at device scale factor 2 or greater.
2. Draw a short line near a visible canvas location, then select it or place a sticky note at a specific point.
3. Compare the pointer location to the rendered object and try clicking the visible object.

**Example scenario:** At device pixel ratio 2, a click 100 CSS pixels from the canvas origin is recorded at coordinate 200.

**Expected behavior:** Pointer coordinates stay in the canvas's logical CSS coordinate space, independent of display density; the canvas backing store alone uses device pixel ratio.

**Actual behavior:** `toPoint` multiplies CSS-relative pointer coordinates by `window.devicePixelRatio` while the render transform already handles that ratio.

**Acceptance criteria:**
- [ ] Drawing and selection align on standard and high-density displays.
- [ ] Resizing and canvas backing-store scaling remain crisp.
- [ ] Remote collaborators render the same logical geometry.
- [ ] Add a focused coordinate test or browser check at scale factors 1 and 2.

**Suggested regression test:** Given a canvas rectangle offset and a DPR of 2, verify a pointer at a CSS offset of `(100, 50)` maps to logical `(100, 50)`.

**Scope boundaries:** Keep the existing canvas element format and drawing tools; avoid a canvas library migration.

**Collaboration considerations:** Coordinates are sent to other clients and persisted. They must remain in one consistent logical coordinate system.

### WB-08 — Arrowheads point toward the line's start

**Difficulty:** Good first issue
**Category:** Canvas rendering
**Status:** Intentionally introduced — awaiting contributor fix
**Affected file:** `frontend/src/utils/canvas.js`

**Description:** The arrow line runs from `(x, y)` to `(x2, y2)`, but the arrowhead angle is calculated in the reverse direction. The arrowhead appears at the endpoint but points back along the line.

**Prerequisites:** Open a room and choose the Arrow tool.

**Steps to reproduce:**
1. Drag an arrow clearly from the top-left toward the bottom-right.
2. Observe the shaft endpoint and arrowhead direction.
3. Repeat in the other diagonal direction and on a collaborator's canvas.

**Example scenario:** Draw from `(20, 20)` to `(120, 80)`; the expected arrowhead points toward `(120, 80)`, but the current head geometry points toward the start.

**Expected behavior:** The arrowhead points from the start toward the second endpoint for every direction and stroke width.

**Actual behavior:** `strokeArrow` calculates `atan2(element.y - element.y2, element.x - element.x2)` instead of the forward vector.

**Acceptance criteria:**
- [ ] Arrowheads face the second endpoint for horizontal, vertical, and diagonal arrows.
- [ ] Shaft placement and arrowhead size remain correct.
- [ ] Add focused rendering/geometry coverage for reversed drag directions.
- [ ] Existing line rendering remains unchanged.

**Suggested regression test:** Use a canvas context spy or extract an arrowhead geometry helper; verify a positive-slope arrowhead extends behind its endpoint on the start side.

**Scope boundaries:** Do not alter the arrow element payload or other drawing tools.

**Collaboration considerations:** The server stores arrow endpoints; this is a client rendering defect and must appear consistently on every client.

## Branch names

Use a short branch name that includes the issue ID where one exists:

```text
fix/wb-01-long-pen-strokes
fix/wb-02-presence-count
fix/wb-03-sticky-color
fix/wb-04-undo-history
fix/wb-06-socket-reconnect
fix/wb-07-pointer-coordinates
docs/whiteboard-contributing
```

## Coding and collaboration guidelines

- Follow surrounding JavaScript conventions and keep the change focused on one issue.
- Reuse existing components, services, and event handlers; preserve the React + Express + Socket.IO + MongoDB architecture.
- Avoid unnecessary dependencies, broad UI redesigns, and unrelated formatting changes.
- Keep socket payload shapes consistent with the event reference in the [README](README.md#socketio-events).
- Clean up event listeners, timers, and subscriptions; handle asynchronous failures deliberately.
- Validate client-provided data on the server even if the UI validates it too.
- Preserve JWT authentication, private-room membership checks, and room-scoped broadcasts.
- Never commit `.env`, credentials, database exports, or sensitive board data.

## Verify a collaboration fix

Use disposable room codes and non-sensitive content. With two or more authorized browser profiles, verify the relevant scenario:

- All clients join the intended room, and private rooms still reject non-members.
- Drawing operations and visual properties match in the same room.
- Presence changes after a join, normal leave, disconnect, and reconnect.
- A reconnect does not register duplicate listeners or duplicate drawing events.
- A second room receives no board, chat, or presence event from the first room.
- Persistence tests use an isolated database; no real board snapshots are deleted or corrupted.

## Tests and checks

Start with a direct reproduction, identify the root cause, implement one focused fix, and add a regression test where practical. Use the scripts that exist:

```bash
cd backend
npm test

cd ../frontend
npm run build
```

Backend MongoDB integration tests require a reachable MongoDB service and use their configured test database. The frontend has no configured test or lint script. For visual or Socket.IO changes, also run both services and verify with two authorized sessions. Report any unavailable check honestly.

## Commits and pull requests

Conventional Commit-style messages are encouraged:

```text
fix(canvas): preserve long pen strokes
fix(socket): retry authorized room connections
fix(rooms): refresh participant presence
test(board): cover empty saved snapshots
docs: improve whiteboard setup instructions
```

Include the issue ID and a link to the actual GitHub issue in the pull request description when one exists. Do not imply that an issue has been published or assigned when it has not.

### Pull request checklist

- [ ] Issue ID and actual issue link, if available.
- [ ] Defect, root cause, and focused fix are described.
- [ ] Tests, builds, and browser sessions run are listed with results.
- [ ] Screenshots or a short recording are included for relevant visual changes.
- [ ] Room isolation, authentication, and private-room authorization remain intact.
- [ ] No secrets, real user data, or unrelated changes are included.
- [ ] Documentation is updated if behavior or setup changed.

## Definition of done

A contribution is ready when its original scenario is reproducible before the fix, the underlying cause is corrected, relevant regression coverage passes, other drawing/collaboration workflows remain functional, room access remains secure, relevant checks are reported, and the patch contains no secrets or unrelated work.

## Maintainer notes

Give each seeded task a unique `WB-NN` ID, keep its reproduction steps synchronized with the current source, and add a regression test when resolving it. If matching GitHub issues are created, link them here and keep their state current. Review the fix against the acceptance criteria, merge it through the repository's normal process, and close the corresponding issue only after the behavior is verified. Do not place credentials or private implementation details in public docs.

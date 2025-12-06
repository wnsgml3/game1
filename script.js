const SIZE = 19;
const WIN = 7;

let board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
let currentPlayer = 1;
let ended = false;
let gridEl = null;
let timerStarted = false;
let timerId = null;
let startTime = 0;
let lastCardTick = 0;
let aiThinking = false;
let defenseSet = new Set();
let obstacles = new Map();
let obstacleMarkers = new Map();
let defenseMarkers = new Map();
let pendingAction = null;
let pendingTurns = 0;
let extraStoneTurn = false;
let stonesPlacedThisTurn = 0;
let firstStoneR = -1;
let firstStoneC = -1;
let blockedForHuman = null;
let blockedForAI = null;
let aiExtraStoneTurn = false;
let aiFirstStoneR = -1;
let aiFirstStoneC = -1;
let blockedMarkersHuman = new Map();
let blockedMarkersAI = new Map();

const boardEl = document.getElementById("board");
const statusTextEl = document.getElementById("statusText");
const resetBtn = document.getElementById("resetBtn");
const winnerEl = document.getElementById("winner");
const appEl = document.querySelector(".app");
const menuEl = document.getElementById("mainMenu");
const playBtn = document.getElementById("playBtn");
const humanCardEl = document.getElementById("humanCard");
const aiCardEl = document.getElementById("aiCard");
const infoBtn = document.getElementById("infoBtn");
const infoOverlayEl = document.getElementById("infoOverlay");

function initBoard() {
  const grid = document.createElement("div");
  grid.className = "grid";
  boardEl.innerHTML = "";
  boardEl.appendChild(grid);
  gridEl = grid;
}

function placeStone(r, c, player) {
  board[r][c] = player;
  const stone = document.createElement("div");
  stone.className = player === 1 ? "stone stone-black" : "stone stone-white";
  const { left, top } = coordToPixel(r, c);
  stone.style.left = `${left}px`;
  stone.style.top = `${top}px`;
  stone.dataset.r = String(r);
  stone.dataset.c = String(c);
  gridEl.appendChild(stone);
}

function getCellSize() {
  const s = getComputedStyle(document.documentElement).getPropertyValue("--cell");
  return parseFloat(s);
}

function getLineWidth() {
  const s = getComputedStyle(document.documentElement).getPropertyValue("--line");
  return parseFloat(s);
}

function coordToPixel(r, c) {
  const cell = getCellSize();
  const line = getLineWidth();
  const offset = cell - line / 2;
  return {
    left: c * cell + offset,
    top: r * cell + offset,
  };
}

function checkWin(r, c, player) {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (const [dr, dc] of dirs) {
    let count = 1;
    count += countDir(r, c, dr, dc, player);
    count += countDir(r, c, -dr, -dc, player);
    if (count >= WIN) return true;
  }
  return false;
}

function countDir(r, c, dr, dc, player) {
  let cnt = 0;
  let nr = r + dr;
  let nc = c + dc;
  while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === player) {
    cnt++;
    nr += dr;
    nc += dc;
  }
  return cnt;
}

function updateStatus() {
  statusTextEl.textContent = currentPlayer === 1 ? "흑 차례" : "백 차례";
  const sample = document.querySelector(".status .stone");
  sample.className = currentPlayer === 1 ? "stone stone-black" : "stone stone-white";
}

function announceWinner(player) {
  winnerEl.textContent = player === 1 ? "흑돌 승리" : "백돌 승리";
  winnerEl.classList.remove("hidden");
}

function reset() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  currentPlayer = 1;
  ended = false;
  winnerEl.classList.add("hidden");
  initBoard();
  updateStatus();
  stopTimer();
  setTimerDisplay(0);
  timerStarted = false;
  lastCardTick = 0;
  hideCardsOverlay();
  aiThinking = false;
  defenseSet = new Set();
  obstacles = new Map();
  obstacleMarkers = new Map();
  defenseMarkers = new Map();
  pendingAction = null;
  pendingTurns = 0;
  extraStoneTurn = false;
  stonesPlacedThisTurn = 0;
  firstStoneR = -1;
  firstStoneC = -1;
  blockedForHuman = null;
  blockedForAI = null;
  aiExtraStoneTurn = false;
  aiFirstStoneR = -1;
  aiFirstStoneC = -1;
  clearBlockedMarkers(true);
  clearBlockedMarkers(false);
}

function startGame() {
  menuEl.classList.add("hidden");
  appEl.classList.remove("hidden");
  reset();
}

function handleClick(e) {
  if (ended) return;
  if (aiThinking) return;
  if (currentPlayer !== 1) return;
  const rect = boardEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const cell = getCellSize();
  const line = getLineWidth();
  const offset = cell - line / 2;
  const c = Math.round((x - offset) / cell);
  const r = Math.round((y - offset) / cell);
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
  if (pendingAction) {
    if (pendingAction === "bomb") {
      applyBomb(r, c);
    } else if (pendingAction === "defense") {
      applyDefense(r, c);
    } else if (pendingAction === "obstacle") {
      applyObstacle(r, c, pendingTurns);
    }
    pendingAction = null;
    pendingTurns = 0;
    return;
  }
  if (board[r][c] !== 0) return;
  if (isCellBlockedByObstacle(r, c)) return;
  if (blockedForHuman && blockedForHuman.has(key(r, c))) return;
  if (extraStoneTurn && stonesPlacedThisTurn === 1) {
    if (inNeighborhood(r, c, firstStoneR, firstStoneC)) return;
  }
  placeStone(r, c, currentPlayer);
  if (!timerStarted) {
    startTimer();
  }
  if (checkWin(r, c, currentPlayer)) {
    ended = true;
    announceWinner(currentPlayer);
    stopTimer();
    return;
  }
  if (extraStoneTurn && stonesPlacedThisTurn === 0) {
    stonesPlacedThisTurn = 1;
    firstStoneR = r;
    firstStoneC = c;
    updateStatus();
    return;
  }
  extraStoneTurn = false;
  stonesPlacedThisTurn = 0;
  firstStoneR = -1;
  firstStoneC = -1;
  blockedForHuman = null;
  clearBlockedMarkers(false);
  currentPlayer = 2;
  updateStatus();
  tickObstacles();
  triggerAiTurn();
}

resetBtn.addEventListener("click", reset);
boardEl.addEventListener("click", handleClick);
playBtn.addEventListener("click", startGame);
infoBtn.addEventListener("click", showInfoOverlay);
infoOverlayEl.addEventListener("click", hideInfoOverlay);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && infoOverlayEl && !infoOverlayEl.classList.contains("hidden")) {
    hideInfoOverlay();
  }
});

const timerTextEl = document.getElementById("timerText");
const cardsOverlayEl = document.getElementById("cardsOverlay");

function setTimerDisplay(ms) {
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  timerTextEl.textContent = `${h}:${m}:${s}`;
  maybeShowCards(total);
}

function startTimer() {
  timerStarted = true;
  startTime = Date.now();
  timerId = setInterval(() => {
    const now = Date.now();
    setTimerDisplay(now - startTime);
  }, 250);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function maybeShowCards(totalSeconds) {
  const intervals = Math.floor(totalSeconds / 30);
  if (intervals > 0 && intervals > lastCardTick) {
    lastCardTick = intervals;
    showCardsOverlay();
  }
}

function showCardsOverlay() {
  cardsOverlayEl.innerHTML = "";
  const container = document.createElement("div");
  container.className = "cards-container";
  const itemsHuman = [drawItem(), drawItem(), drawItem()];
  const itemsAI = [drawItem(), drawItem(), drawItem()];
  const chosenAI = itemsAI[Math.floor(Math.random() * itemsAI.length)];
  applyItemToPlayer(2, chosenAI);
  setChosenCard(2, chosenAI);
  for (let i = 0; i < itemsHuman.length; i++) {
    const item = itemsHuman[i];
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.item = item;
    card.textContent = ITEM_LABELS[item] || item;
    card.addEventListener("click", onCardClick);
    container.appendChild(card);
  }
  cardsOverlayEl.appendChild(container);
  cardsOverlayEl.classList.remove("hidden");
}

function hideCardsOverlay() {
  cardsOverlayEl.classList.add("hidden");
  cardsOverlayEl.innerHTML = "";
}

function showInfoOverlay() {
  infoOverlayEl.innerHTML = "";
  const modal = document.createElement("div");
  modal.className = "info-modal";
  modal.innerHTML = `
    <div class="info-title">🎮 아이템 칠목 게임 설명</div>
    <div class="info-content">
      <p>이 게임은 AI와 대전하는 칠목 게임으로, 오목이 아닌 7개의 돌을 연속으로 놓아야 승리합니다. 하지만 단순한 칠목이 아니라, 전략을 뒤흔드는 아이템 시스템이 추가된 특별한 칠목입니다!</p>
      <p>게임에는 총 6가지 아이템이 있으며, 30초마다 랜덤으로 3개의 카드가 등장합니다.</p>
      <h3>🧩 아이템 목록</h3>
      <ol>
        <li>
          <div>꽝</div>
          <div>– 아무 효과가 없는 카드입니다.</div>
        </li>
        <li>
          <div>랜덤 바둑 돌 1개 제거</div>
          <div>– 바둑판 위의 모든 돌 중 무작위로 1개가 제거됩니다.</div>
        </li>
        <li>
          <div>선택한 칸을 중심으로 주변 8칸 바둑 돌 랜덤 제거</div>
          <div>– 선택한 칸을 중심으로 주변 8칸(3×3 영역)에 있는 돌을 랜덤으로 제거합니다.</div>
          <div>– 제거되는 돌의 수는 1~8개입니다.</div>
        </li>
        <li>
          <div>선택한 1개의 칸 착수 불가</div>
          <div>– 선택한 칸을 한 턴 동안 착수할 수 없습니다.</div>
        </li>
        <li>
          <div>바둑 돌 2개 놓기</div>
          <div>– 이 턴에 돌을 2개 놓을 수 있습니다.</div>
          <div>– 단, 첫 번째 돌의 주변 8칸(3×3 영역)에는 두 번째 돌을 놓을 수 없습니다.</div>
        </li>
        <li>
          <div>상대 착수 제한(30%)</div>
          <div>– 1턴 동안 상대가 착수할 수 없는 칸을 생성합니다.</div>
          <div>– 현재 빈 칸의 30%를 무작위로 선택하여 해당 턴 동안 착수 금지 상태로 만듭니다.</div>
        </li>
      </ol>
    </div>
    <button class="btn info-close" aria-label="설명 닫기">닫기</button>
  `;
  modal.addEventListener("click", (e) => e.stopPropagation());
  infoOverlayEl.appendChild(modal);
  infoOverlayEl.classList.remove("hidden");
  const closeBtn = modal.querySelector(".info-close");
  if (closeBtn) closeBtn.addEventListener("click", hideInfoOverlay);
}

function hideInfoOverlay() {
  infoOverlayEl.classList.add("hidden");
  infoOverlayEl.innerHTML = "";
}

function key(rc, cc) {
  return `${rc},${cc}`;
}

function isCellBlockedByObstacle(r, c) {
  const k = key(r, c);
  const t = obstacles.get(k);
  return !!t && t > 0;
}

function addMarker(r, c, type) {
  const { left, top } = coordToPixel(r, c);
  const m = document.createElement("div");
  m.className = `marker ${type}`;
  m.style.left = `${left}px`;
  m.style.top = `${top}px`;
  gridEl.appendChild(m);
  const k = key(r, c);
  if (type === "defense") defenseMarkers.set(k, m);
  if (type === "obstacle") obstacleMarkers.set(k, m);
}

function removeMarker(r, c, type) {
  const k = key(r, c);
  const map = type === "defense" ? defenseMarkers : obstacleMarkers;
  const el = map.get(k);
  if (el && el.parentNode) el.parentNode.removeChild(el);
  map.delete(k);
}

function applyBomb(r, c) {
  const candidates = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      const k = key(nr, nc);
      if (defenseSet.has(k)) continue;
      if (board[nr][nc] !== 0) candidates.push([nr, nc]);
    }
  }
  if (candidates.length === 0) {
    showToast("폭탄: 제거할 돌이 없습니다.", 1500);
    return;
  }
  const maxRemove = Math.min(8, candidates.length);
  const removeCount = Math.floor(Math.random() * maxRemove) + 1; // 1..maxRemove
  for (let i = 0; i < removeCount; i++) {
    const idx = Math.floor(Math.random() * candidates.length);
    const [rr, cc] = candidates[idx];
    candidates.splice(idx, 1);
    removeStone(rr, cc);
  }
}

function applyDefense(r, c) {
  const k = key(r, c);
  defenseSet.add(k);
  addMarker(r, c, "defense");
}

function applyObstacle(r, c, turns) {
  const k = key(r, c);
  obstacles.set(k, turns);
  addMarker(r, c, "obstacle");
}

function removeStone(r, c) {
  board[r][c] = 0;
  const el = gridEl.querySelector(`.stone[data-r='${r}'][data-c='${c}']`);
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function tickObstacles() {
  const entries = Array.from(obstacles.entries());
  for (const [k, t] of entries) {
    const nt = t - 1;
    if (nt <= 0) {
      obstacles.delete(k);
      const [rr, cc] = k.split(",").map(Number);
      removeMarker(rr, cc, "obstacle");
    } else {
      obstacles.set(k, nt);
    }
  }
}

function inNeighborhood(r, c, r0, c0) {
  return Math.abs(r - r0) <= 1 && Math.abs(c - c0) <= 1;
}

const ITEM_IDS = [
  "miss",
  "miss",
  "miss",
  "removeRandom",
  "bomb",
  "obstacle",
  "doublePlace",
  "limitOpponent",
];

const ITEM_LABELS = {
  miss: "꽝",
  removeRandom: "랜덤 바둑 돌 1개 제거",
  bomb: "선택한 칸을 중심으로 주변 8칸 바둑 돌 랜덤 제거",
  obstacle: "선택한 1개의 칸 착수 불가",
  doublePlace: "바둑 돌 2개 놓기(첫 번째 돌 주변 8칸에 두 번째 돌 착수 불가)",
  limitOpponent: "상대 착수 제한(30%)",
};

function drawItem() {
  const i = Math.floor(Math.random() * ITEM_IDS.length);
  return ITEM_IDS[i];
}

function onCardClick(e) {
  const item = e.currentTarget.dataset.item;
  hideCardsOverlay();
  applyItemToPlayer(1, item);
  setChosenCard(1, item);
}

function applyItemToPlayer(player, item) {
  if (item === "miss") return;
  if (item === "removeRandom") {
    const stones = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] !== 0) stones.push([r, c]);
      }
    }
    if (stones.length === 0) return;
    const idx = Math.floor(Math.random() * stones.length);
    const [rr, cc] = stones[idx];
    removeStone(rr, cc);
    showToast(`랜덤 바둑 돌 1개 제거: (행 ${rr + 1}, 열 ${cc + 1})`, 2000);
    return;
  }
  if (item === "bomb") {
    if (player === 1) {
      pendingAction = "bomb";
      return;
    } else {
      const [br, bc] = chooseBestBombTarget();
      applyBomb(br, bc);
      return;
    }
  }
  if (item === "obstacle") {
    if (player === 1) {
      pendingAction = "obstacle";
      pendingTurns = 2;
      return;
    } else {
      const [or, oc] = chooseObstacleTargetAgainstHuman();
      applyObstacle(or, oc, 2);
      return;
    }
  }
  if (item === "doublePlace") {
    if (player === 1) {
      extraStoneTurn = true;
      stonesPlacedThisTurn = 0;
      return;
    } else {
      aiExtraStoneTurn = true;
      return;
    }
  }
  if (item === "limitOpponent") {
    const empties = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) empties.push([r, c]);
      }
    }
    const count = Math.floor(empties.length * 0.3);
    const set = new Set();
    let n = count;
    while (n > 0 && empties.length > 0) {
      const idx = Math.floor(Math.random() * empties.length);
      const [rr, cc] = empties[idx];
      set.add(key(rr, cc));
      empties.splice(idx, 1);
      n--;
    }
    if (player === 1) {
      blockedForAI = set;
      renderBlockedMarkers(set, true);
    } else {
      blockedForHuman = set;
      renderBlockedMarkers(set, false);
    }
    return;
  }
}

function setChosenCard(player, item) {
  const label = ITEM_LABELS[item] || item;
  const target = player === 1 ? humanCardEl : aiCardEl;
  if (!target) return;
  target.innerHTML = "";
  const chosen = document.createElement("div");
  chosen.className = "chosen-card";
  chosen.textContent = label;
  target.appendChild(chosen);
}

function showToast(message, ms = 1500) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }, ms);
}
function wouldWin(r, c, player) {
  if (board[r][c] !== 0) return false;
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (const [dr, dc] of dirs) {
    const count = 1 + countDir(r, c, dr, dc, player) + countDir(r, c, -dr, -dc, player);
    if (count >= WIN) return true;
  }
  return false;
}

function hasNeighbor(r, c) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] !== 0) return true;
    }
  }
  return false;
}

function scoreDir(r, c, dr, dc, player) {
  let a = countDir(r, c, dr, dc, player);
  let b = countDir(r, c, -dr, -dc, player);
  let nr1 = r + dr;
  let nc1 = c + dc;
  while (nr1 >= 0 && nr1 < SIZE && nc1 >= 0 && nc1 < SIZE && board[nr1][nc1] === player) {
    nr1 += dr;
    nc1 += dc;
  }
  let open1 = nr1 >= 0 && nr1 < SIZE && nc1 >= 0 && nc1 < SIZE && board[nr1][nc1] === 0 ? 1 : 0;
  let nr2 = r - dr;
  let nc2 = c - dc;
  while (nr2 >= 0 && nr2 < SIZE && nc2 >= 0 && nc2 < SIZE && board[nr2][nc2] === player) {
    nr2 -= dr;
    nc2 -= dc;
  }
  let open2 = nr2 >= 0 && nr2 < SIZE && nc2 >= 0 && nc2 < SIZE && board[nr2][nc2] === 0 ? 1 : 0;
  const total = a + b + 1;
  const open = open1 + open2;
  return total * total + open;
}

function scoreMove(r, c) {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  let attack = 0;
  let defend = 0;
  for (const [dr, dc] of dirs) {
    attack = Math.max(attack, scoreDir(r, c, dr, dc, 2));
    defend = Math.max(defend, scoreDir(r, c, dr, dc, 1));
  }
  const center = (SIZE - 1) / 2;
  const dist = Math.abs(r - center) + Math.abs(c - center);
  const centerBias = Math.max(0, 6 - dist);
  return attack * 1.2 + defend + centerBias;
}

function chooseAiMove() {
  let candidates = [];
  let anyStone = false;
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] !== 0) anyStone = true;
    }
  }
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) {
        if (isCellBlockedByObstacle(r, c)) continue;
        if (blockedForAI && blockedForAI.has(key(r, c))) continue;
        if (!anyStone || hasNeighbor(r, c)) candidates.push([r, c]);
      }
    }
  }
  if (candidates.length === 0) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) {
          if (isCellBlockedByObstacle(r, c)) continue;
          candidates.push([r, c]);
        }
      }
    }
  }
  if (blockedForAI && candidates.length === 0) {
    blockedForAI = null;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0 && !isCellBlockedByObstacle(r, c)) candidates.push([r, c]);
      }
    }
  }
  for (const [r, c] of candidates) {
    if (wouldWin(r, c, 2)) return [r, c];
  }
  for (const [r, c] of candidates) {
    if (wouldWin(r, c, 1)) return [r, c];
  }
  let best = null;
  let bestScore = -Infinity;
  for (const [r, c] of candidates) {
    const s = scoreMove(r, c);
    if (s > bestScore) {
      bestScore = s;
      best = [r, c];
    }
  }
  return best || null;
}

function aiMove() {
  if (ended) {
    aiThinking = false;
    return;
  }
  const move = chooseAiMove();
  if (!move) {
    aiThinking = false;
    return;
  }
  const [r, c] = move;
  placeStone(r, c, 2);
  if (aiExtraStoneTurn) {
    aiFirstStoneR = r;
    aiFirstStoneC = c;
  }
  if (checkWin(r, c, 2)) {
    ended = true;
    announceWinner(2);
    stopTimer();
    aiThinking = false;
    return;
  }
  if (aiExtraStoneTurn) {
    const move2 = chooseAiSecondMove(aiFirstStoneR, aiFirstStoneC);
    if (move2) {
      const [r2, c2] = move2;
      placeStone(r2, c2, 2);
      if (checkWin(r2, c2, 2)) {
        ended = true;
        announceWinner(2);
        stopTimer();
        aiThinking = false;
        aiExtraStoneTurn = false;
        aiFirstStoneR = -1;
        aiFirstStoneC = -1;
        return;
      }
    }
    aiExtraStoneTurn = false;
    aiFirstStoneR = -1;
    aiFirstStoneC = -1;
  }
  currentPlayer = 1;
  updateStatus();
  blockedForAI = null;
  clearBlockedMarkers(true);
  tickObstacles();
  aiThinking = false;
}

function triggerAiTurn() {
  aiThinking = true;
  setTimeout(aiMove, 1000);
}

function chooseBestBombTarget() {
  let best = [Math.floor(SIZE / 2), Math.floor(SIZE / 2)];
  let bestScore = -Infinity;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      let score = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
          const k = key(nr, nc);
          if (defenseSet.has(k)) continue;
          if (board[nr][nc] !== 0) score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = [r, c];
      }
    }
  }
  return best;
}

function chooseObstacleTargetAgainstHuman() {
  let empties = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0 && !isCellBlockedByObstacle(r, c)) empties.push([r, c]);
    }
  }
  let best = null;
  let bestScore = -Infinity;
  for (const [r, c] of empties) {
    let score = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
        if (board[nr][nc] === 1) score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = [r, c];
    }
  }
  return best || (empties.length ? empties[Math.floor(Math.random() * empties.length)] : [Math.floor(SIZE / 2), Math.floor(SIZE / 2)]);
}

function chooseAiSecondMove(r0, c0) {
  let candidates = [];
  let anyStone = false;
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] !== 0) anyStone = true;
    }
  }
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0 && !inNeighborhood(r, c, r0, c0)) {
        if (isCellBlockedByObstacle(r, c)) continue;
        if (!anyStone || hasNeighbor(r, c)) candidates.push([r, c]);
      }
    }
  }
  if (candidates.length === 0) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const [r, c] of candidates) {
    const s = scoreMove(r, c);
    if (s > bestScore) {
      bestScore = s;
      best = [r, c];
    }
  }
  return best;
}

function renderBlockedMarkers(set, forAI) {
  const map = forAI ? blockedMarkersAI : blockedMarkersHuman;
  clearBlockedMarkers(forAI);
  for (const k of set) {
    const [r, c] = k.split(",").map(Number);
    const { left, top } = coordToPixel(r, c);
    const m = document.createElement("div");
    m.className = "marker blocked";
    m.style.left = `${left}px`;
    m.style.top = `${top}px`;
    gridEl.appendChild(m);
    map.set(k, m);
  }
}

function clearBlockedMarkers(forAI) {
  const map = forAI ? blockedMarkersAI : blockedMarkersHuman;
  for (const [, el] of map) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  map.clear();
}

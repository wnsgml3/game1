const SIZE = 19;
const WIN = 5;

let board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
let currentPlayer = 1;
let ended = false;
let gridEl = null;
let timerStarted = false;
let timerId = null;
let startTime = 0;
let lastMinuteShown = 0;

const boardEl = document.getElementById("board");
const statusTextEl = document.getElementById("statusText");
const resetBtn = document.getElementById("resetBtn");
const winnerEl = document.getElementById("winner");

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
  lastMinuteShown = 0;
  hideCardsOverlay();
}

function handleClick(e) {
  if (ended) return;
  const rect = boardEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const cell = getCellSize();
  const line = getLineWidth();
  const offset = cell - line / 2;
  const c = Math.round((x - offset) / cell);
  const r = Math.round((y - offset) / cell);
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
  if (board[r][c] !== 0) return;
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
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateStatus();
}

resetBtn.addEventListener("click", reset);
boardEl.addEventListener("click", handleClick);

initBoard();
updateStatus();

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
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes > 0 && minutes > lastMinuteShown) {
    lastMinuteShown = minutes;
    showCardsOverlay();
  }
}

function showCardsOverlay() {
  cardsOverlayEl.innerHTML = "";
  const container = document.createElement("div");
  container.className = "cards-container";
  for (let i = 0; i < 3; i++) {
    const card = document.createElement("div");
    card.className = "card";
    card.textContent = "카드";
    card.addEventListener("click", hideCardsOverlay);
    container.appendChild(card);
  }
  cardsOverlayEl.appendChild(container);
  cardsOverlayEl.classList.remove("hidden");
}

function hideCardsOverlay() {
  cardsOverlayEl.classList.add("hidden");
  cardsOverlayEl.innerHTML = "";
}

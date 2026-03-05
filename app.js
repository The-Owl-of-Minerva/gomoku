// ====================== Board / UI Config ======================
const SIZE = 19;
const PADDING = 30;
const CANVAS_SIZE = 760;
const GRID = (CANVAS_SIZE - PADDING * 2) / (SIZE - 1);

const EMPTY = 0, BLACK = 1, WHITE = 2;

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const modeSel = document.getElementById("mode");
const turnBadge = document.getElementById("turnBadge");
const msg = document.getElementById("msg");
const btnRestart = document.getElementById("btnRestart");
const btnUndo = document.getElementById("btnUndo");

const images = {
  boardBg: new Image(),
  black: new Image(),
  white: new Image(),
};
images.boardBg.src = "assets/board.svg";
images.black.src = "assets/black.svg";
images.white.src = "assets/white.svg";

let board, current, gameOver, moves;

// ====================== Game Init / UI ======================
function init() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
  current = BLACK;
  gameOver = false;
  moves = [];
  msg.textContent = "";
  btnUndo.disabled = true;
  updateTurnUI();
  draw();
}

function updateTurnUI() {
  if (gameOver) return;
  turnBadge.textContent = `当前：${current === BLACK ? "黑棋" : "白棋"}`;
}

// ====================== Coord Helpers ======================
function cellToXY(r, c) {
  return { x: PADDING + c * GRID, y: PADDING + r * GRID };
}

function xyToCell(x, y) {
  const cx = (x - PADDING) / GRID;
  const cy = (y - PADDING) / GRID;
  const c = Math.round(cx);
  const r = Math.round(cy);
  if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return null;

  const { x: gx, y: gy } = cellToXY(r, c);
  if (Math.hypot(x - gx, y - gy) > GRID * 0.45) return null;
  return { r, c };
}

// ====================== Render ======================
function draw() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  if (images.boardBg.complete) ctx.drawImage(images.boardBg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  else { ctx.fillStyle = "#d7b57a"; ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); }

  // grid
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 1;
  for (let i = 0; i < SIZE; i++) {
    const x = PADDING + i * GRID;
    const y = PADDING + i * GRID;

    ctx.beginPath(); ctx.moveTo(PADDING, y); ctx.lineTo(CANVAS_SIZE - PADDING, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, PADDING); ctx.lineTo(x, CANVAS_SIZE - PADDING); ctx.stroke();
  }

  // star points (3,9,15)
  drawStarPoints([3, 9, 15]);

  // pieces
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === EMPTY) continue;
      drawPiece(r, c, board[r][c]);
    }
  }

  if (moves.length) drawLastMoveMarker(moves[moves.length - 1]);
}

function drawStarPoints(indices) {
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  for (const r of indices) for (const c of indices) {
    const { x, y } = cellToXY(r, c);
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPiece(r, c, color) {
  const { x, y } = cellToXY(r, c);
  const img = color === BLACK ? images.black : images.white;
  const size = GRID * 0.92, half = size / 2;

  if (img.complete) ctx.drawImage(img, x - half, y - half, size, size);
  else {
    ctx.beginPath();
    ctx.fillStyle = color === BLACK ? "#111" : "#f5f5f5";
    ctx.arc(x, y, half, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLastMoveMarker(m) {
  const { x, y } = cellToXY(m.r, m.c);
  ctx.strokeStyle = "rgba(255,60,60,0.95)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, GRID * 0.18, 0, Math.PI * 2); ctx.stroke();
}

// ====================== Core Rules ======================
function place(r, c) {
  if (gameOver) return;
  if (board[r][c] !== EMPTY) return;

  if (modeSel.value === "online") {
    msg.textContent = "在线对战需要后端/实时服务（GitHub Pages 无法单独实现）。";
    return;
  }

  board[r][c] = current;
  moves.push({ r, c, color: current });
  btnUndo.disabled = moves.length === 0;
  draw();

  if (checkWin(r, c, current)) {
    gameOver = true;
    msg.textContent = `${current === BLACK ? "黑棋" : "白棋"}获胜！`;
    turnBadge.textContent = "对局结束";
    return;
  }

  if (moves.length === SIZE * SIZE) {
    gameOver = true;
    msg.textContent = "平局：棋盘已满。";
    turnBadge.textContent = "对局结束";
    return;
  }

  current = current === BLACK ? WHITE : BLACK;
  updateTurnUI();

  // Human vs AI: you play black, AI plays white
  if (modeSel.value === "ai" && current === WHITE) {
    setTimeout(() => {
      const mv = aiPickMove(WHITE);
      if (mv) place(mv.r, mv.c);
    }, 80);
  }
}

function checkWin(r, c, color) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    const count = 1 + countDir(r, c, dr, dc, color) + countDir(r, c, -dr, -dc, color);
    if (count >= 5) return true;
  }
  return false;
}

function countDir(r, c, dr, dc, color) {
  let rr = r + dr, cc = c + dc, cnt = 0;
  while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === color) {
    cnt++; rr += dr; cc += dc;
  }
  return cnt;
}

function undo() {
  if (moves.length === 0) return;

  const mode = modeSel.value;
  if (mode === "ai") {
    if (moves.length >= 1) {
      const last1 = moves.pop(); board[last1.r][last1.c] = EMPTY;
    }
    if (moves.length >= 1) {
      const last2 = moves.pop(); board[last2.r][last2.c] = EMPTY;
    }
    current = BLACK;
  } else {
    const last = moves.pop();
    board[last.r][last.c] = EMPTY;
    current = last.color;
  }

  gameOver = false;
  msg.textContent = "";
  btnUndo.disabled = moves.length === 0;
  updateTurnUI();
  draw();
}

// ====================== Stronger AI (Defense-First + Alpha-Beta) ======================

// Tuning
const AI_DEPTH = 3;
const ROOT_BRANCH = 20;
const INNER_BRANCH = 14;

const SCORE = {
  FIVE: 10000000,
  OPEN_FOUR: 250000,
  FOUR: 60000,
  OPEN_THREE: 12000,
  THREE: 3500,
  OPEN_TWO: 700,
  TWO: 220,
};

// Defense knobs
const DEFENSE_WEIGHT = 1.35;          // increase = more defensive
const MUST_BLOCK_OPEN_THREE = true;   // treat open-three threats as must-block
const MUST_BLOCK_STRAIGHT_THREE_RUN = true; // block ".XXX." (3-in-a-row with both ends empty)

function aiPickMove(aiColor) {
  const opp = aiColor === BLACK ? WHITE : BLACK;

  const candidates = genCandidatesNeighborhood(2);
  if (candidates.length === 0) return { r: 9, c: 9 };

  // 0) Win now
  for (const p of candidates) {
    board[p.r][p.c] = aiColor;
    const win = checkWin(p.r, p.c, aiColor);
    board[p.r][p.c] = EMPTY;
    if (win) return p;
  }

  // 1) Block opponent immediate win
  for (const p of candidates) {
    board[p.r][p.c] = opp;
    const win = checkWin(p.r, p.c, opp);
    board[p.r][p.c] = EMPTY;
    if (win) return p;
  }

  // 2) Block existing straight 3-run ".XXX."
  if (MUST_BLOCK_STRAIGHT_THREE_RUN) {
    const blockRun = findBlockOpenThreeRuns(aiColor);
    if (blockRun) return blockRun;
  }

  // 3) Must-block tactical threats
  const block = findUrgentBlock(aiColor);
  if (block) return block;

  // 4) Create strong threats (attack after defense)
  const attack = findUrgentAttack(aiColor);
  if (attack) return attack;

  // 5) Alpha-beta search
  const ordered = candidates
    .map(p => ({ p, s: quickPointHeuristic(p.r, p.c, aiColor) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, ROOT_BRANCH)
    .map(x => x.p);

  let best = ordered[0];
  let bestScore = -Infinity;

  for (const p of ordered) {
    board[p.r][p.c] = aiColor;
    const score = -alphaBeta(AI_DEPTH - 1, -Infinity, Infinity, opp, aiColor);
    board[p.r][p.c] = EMPTY;

    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  return best;
}

// ---------- Defense: find ".XXX." runs and block an end ----------
function findBlockOpenThreeRuns(aiColor) {
  const opp = aiColor === BLACK ? WHITE : BLACK;

  const candSet = new Set(genCandidatesNeighborhood(3).map(p => p.r + "," + p.c));

  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  let best = null;
  let bestUrgency = -Infinity;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== opp) continue;

      for (const [dr, dc] of dirs) {
        const r1 = r + dr, c1 = c + dc;
        const r2 = r + 2 * dr, c2 = c + 2 * dc;
        if (!inBoard(r2, c2)) continue;
        if (board[r1]?.[c1] !== opp || board[r2]?.[c2] !== opp) continue;

        const rl = r - dr, cl = c - dc;
        const rr = r + 3 * dr, cr = c + 3 * dc;

        const leftEmpty = inBoard(rl, cl) && board[rl][cl] === EMPTY;
        const rightEmpty = inBoard(rr, cr) && board[rr][cr] === EMPTY;

        if (!(leftEmpty && rightEmpty)) continue;

        const leftKey = rl + "," + cl;
        const rightKey = rr + "," + cr;

        const leftOk = candSet.has(leftKey);
        const rightOk = candSet.has(rightKey);
        if (!leftOk && !rightOk) continue;

        const pick = pickMoreUrgentEnd({ r: rl, c: cl }, { r: rr, c: cr }, opp);
        if (pick.urgency > bestUrgency) {
          bestUrgency = pick.urgency;
          best = pick.p;
        }
      }
    }
  }

  return best;
}

function pickMoreUrgentEnd(p1, p2, oppColor) {
  let best = { p: p1, urgency: -Infinity };

  for (const p of [p1, p2]) {
    if (!inBoard(p.r, p.c) || board[p.r][p.c] !== EMPTY) continue;

    board[p.r][p.c] = oppColor;
    const t = threatLevelAt(p.r, p.c, oppColor);
    const win = checkWin(p.r, p.c, oppColor);
    board[p.r][p.c] = EMPTY;

    let urgency = 0;
    if (win) urgency += SCORE.FIVE;
    urgency += t.openFour * SCORE.OPEN_FOUR;
    urgency += t.four * SCORE.FOUR;
    urgency += (t.doubleOpenThree ? 2 : 0) * SCORE.OPEN_THREE;
    urgency += t.openThree * SCORE.OPEN_THREE * 0.6;
    urgency += centerBias(p.r, p.c);

    if (urgency > best.urgency) best = { p, urgency };
  }

  return best;
}

function centerBias(r, c) {
  const mid = (SIZE - 1) / 2;
  const dist = Math.abs(r - mid) + Math.abs(c - mid);
  return 50 - dist;
}

function inBoard(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

// ---------- Alpha-beta ----------
function alphaBeta(depth, alpha, beta, side, aiColor) {
  const opp = side === BLACK ? WHITE : BLACK;

  if (depth <= 0) return evaluateBoard(aiColor);

  const candidates = genCandidatesNeighborhood(2);
  if (candidates.length === 0) return evaluateBoard(aiColor);

  const ordered = candidates
    .map(p => ({ p, s: quickPointHeuristic(p.r, p.c, side) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, INNER_BRANCH)
    .map(x => x.p);

  for (const p of ordered) {
    board[p.r][p.c] = side;

    if (checkWin(p.r, p.c, side)) {
      board[p.r][p.c] = EMPTY;
      return side === aiColor ? SCORE.FIVE : -SCORE.FIVE;
    }

    const val = -alphaBeta(depth - 1, -beta, -alpha, opp, aiColor);
    board[p.r][p.c] = EMPTY;

    if (val > alpha) alpha = val;
    if (alpha >= beta) break;
  }

  return alpha;
}

// ---------- Candidate generation ----------
function genCandidatesNeighborhood(radius) {
  if (moves.length === 0) return [{ r: 9, c: 9 }];

  const set = new Set();
  const out = [];

  for (const m of moves) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const r = m.r + dr, c = m.c + dc;
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) continue;
        if (board[r][c] !== EMPTY) continue;
        const key = r + "," + c;
        if (set.has(key)) continue;
        set.add(key);
        out.push({ r, c });
      }
    }
  }
  return out;
}

// ---------- Heuristics / Eval ----------
function quickPointHeuristic(r, c, side) {
  if (board[r][c] !== EMPTY) return -Infinity;
  board[r][c] = side;
  const s = evaluatePoint(r, c, side);
  board[r][c] = EMPTY;
  return s;
}

function evaluateBoard(aiColor) {
  const opp = aiColor === BLACK ? WHITE : BLACK;

  let aiScore = 0;
  let oppScore = 0;

  const cand = genCandidatesNeighborhood(2);
  for (const p of cand) {
    aiScore += potentialAt(p.r, p.c, aiColor);
    oppScore += potentialAt(p.r, p.c, opp);
  }

  const extraOppThreat = estimateOppOpenThreePressure(opp);
  return aiScore - oppScore * DEFENSE_WEIGHT - extraOppThreat;
}

function estimateOppOpenThreePressure(opp) {
  const cand = genCandidatesNeighborhood(2);
  let penalty = 0;

  for (const p of cand) {
    if (board[p.r][p.c] !== EMPTY) continue;
    board[p.r][p.c] = opp;
    const t = threatLevelAt(p.r, p.c, opp);
    board[p.r][p.c] = EMPTY;

    penalty += t.openThree * 2500;
    if (t.doubleOpenThree) penalty += 8000;
  }

  return penalty;
}

function potentialAt(r, c, color) {
  if (board[r][c] !== EMPTY) return 0;
  board[r][c] = color;
  const s = evaluatePoint(r, c, color);
  board[r][c] = EMPTY;
  return s;
}

function evaluatePoint(r, c, color) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  let total = 0;
  for (const [dr, dc] of dirs) {
    const line = getLine(r, c, dr, dc, color);
    total += scoreLine(line);
  }
  return total;
}

// map 9 cells around (r,c): self=1 empty=0 opp/border=2
function getLine(r, c, dr, dc, color) {
  const opp = color === BLACK ? WHITE : BLACK;
  let s = "";
  for (let k = -4; k <= 4; k++) {
    const rr = r + k * dr, cc = c + k * dc;
    if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) s += "2";
    else if (board[rr][cc] === EMPTY) s += "0";
    else if (board[rr][cc] === color) s += "1";
    else if (board[rr][cc] === opp) s += "2";
  }
  return s;
}

function scoreLine(line) {
  if (line.includes("11111")) return SCORE.FIVE;
  if (line.includes("011110")) return SCORE.OPEN_FOUR;

  if (
    line.includes("211110") || line.includes("011112") ||
    line.includes("10111")  || line.includes("11101")  || line.includes("11011")
  ) return SCORE.FOUR;

  if (line.includes("01110") || line.includes("010110") || line.includes("011010"))
    return SCORE.OPEN_THREE;

  if (
    line.includes("21110") || line.includes("01112") ||
    line.includes("01011") || line.includes("11010") ||
    line.includes("10110") || line.includes("01101")
  ) return SCORE.THREE;

  if (line.includes("001100") || line.includes("0010100") || line.includes("010100"))
    return SCORE.OPEN_TWO;

  if (line.includes("21100") || line.includes("00112") || line.includes("01010") || line.includes("01100"))
    return SCORE.TWO;

  return 0;
}

// ---------- Tactical must-block / must-attack ----------
function findUrgentBlock(aiColor) {
  const opp = aiColor === BLACK ? WHITE : BLACK;
  const candidates = genCandidatesNeighborhood(2);

  for (const p of candidates) {
    board[p.r][p.c] = opp;

    if (checkWin(p.r, p.c, opp)) {
      board[p.r][p.c] = EMPTY;
      return p;
    }

    const t = threatLevelAt(p.r, p.c, opp);
    board[p.r][p.c] = EMPTY;

    if (t.openFour > 0 || t.four > 0 || t.doubleOpenThree) return p;
    if (MUST_BLOCK_OPEN_THREE && t.openThree > 0) return p;
  }
  return null;
}

function findUrgentAttack(aiColor) {
  const candidates = genCandidatesNeighborhood(2);

  for (const p of candidates) {
    board[p.r][p.c] = aiColor;

    if (checkWin(p.r, p.c, aiColor)) {
      board[p.r][p.c] = EMPTY;
      return p;
    }

    const t = threatLevelAt(p.r, p.c, aiColor);
    board[p.r][p.c] = EMPTY;

    if (t.openFour > 0) return p;
    if (t.four > 0) return p;
    if (t.doubleOpenThree) return p;
  }
  return null;
}

function threatLevelAt(r, c, color) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  let openFour = 0;
  let four = 0;
  let openThree = 0;

  for (const [dr, dc] of dirs) {
    const line = getLine(r, c, dr, dc, color);

    if (line.includes("011110")) openFour++;

    if (
      line.includes("211110") || line.includes("011112") ||
      line.includes("10111")  || line.includes("11101")  || line.includes("11011")
    ) four++;

    if (line.includes("01110") || line.includes("010110") || line.includes("011010"))
      openThree++;
  }

  return {
    openFour,
    four,
    openThree,
    doubleOpenThree: openThree >= 2
  };
}

// ====================== Events ======================
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const cell = xyToCell(x, y);
  if (!cell) return;
  place(cell.r, cell.c);
});

btnRestart.addEventListener("click", init);
btnUndo.addEventListener("click", undo);
modeSel.addEventListener("change", () => init());

// redraw after assets loaded
for (const k of Object.keys(images)) images[k].addEventListener("load", () => draw());

init();
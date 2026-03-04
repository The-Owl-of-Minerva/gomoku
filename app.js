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

function place(r, c) {
  if (gameOver) return;
  if (board[r][c] !== EMPTY) return;

  // online 模式这里只做提示（静态站点没后端）
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

  // 人机：你执黑，AI执白
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
    const count = 1 + countDir(r,c,dr,dc,color) + countDir(r,c,-dr,-dc,color);
    if (count >= 5) return true;
  }
  return false;
}
function countDir(r,c,dr,dc,color){
  let rr=r+dr, cc=c+dc, cnt=0;
  while(rr>=0&&rr<SIZE&&cc>=0&&cc<SIZE&&board[rr][cc]===color){ cnt++; rr+=dr; cc+=dc; }
  return cnt;
}

function undo() {
  if (moves.length === 0) return;

  // 人机模式下：一次悔两步（你一步 + AI一步），避免轮次错乱
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
    current = last.color; // 回到刚刚那方
  }

  gameOver = false;
  msg.textContent = "";
  btnUndo.disabled = moves.length === 0;
  updateTurnUI();
  draw();
}

// --- 一个“能玩就行”的简易 AI：
// 优先：能赢就赢；否则先堵对方必胜点；否则在已有棋子附近随机取一个更“靠中心”的点
function aiPickMove(aiColor) {
  const opp = aiColor === BLACK ? WHITE : BLACK;

  const candidates = genCandidates(2);
  if (!candidates.length) return { r: 9, c: 9 };

  // 1) 自己能立刻成五
  for (const p of candidates) {
    board[p.r][p.c] = aiColor;
    const ok = checkWin(p.r, p.c, aiColor);
    board[p.r][p.c] = EMPTY;
    if (ok) return p;
  }
  // 2) 堵对手立刻成五
  for (const p of candidates) {
    board[p.r][p.c] = opp;
    const ok = checkWin(p.r, p.c, opp);
    board[p.r][p.c] = EMPTY;
    if (ok) return p;
  }

  // 3) 选更靠中心的（带一点随机）
  const center = (SIZE - 1) / 2;
  candidates.sort((a,b) => {
    const da = Math.hypot(a.r-center, a.c-center);
    const db = Math.hypot(b.r-center, b.c-center);
    return da - db;
  });

  const topK = Math.min(8, candidates.length);
  return candidates[Math.floor(Math.random() * topK)];
}

function genCandidates(radius) {
  // 只考虑“已有棋子附近 radius 格”的空位，加速
  const hasAny = moves.length > 0;
  const set = new Set();
  const out = [];

  if (!hasAny) return [{ r: 9, c: 9 }];

  for (const m of moves) {
    for (let dr = -radius; dr <= radius; dr++) for (let dc = -radius; dc <= radius; dc++) {
      const r = m.r + dr, c = m.c + dc;
      if (r<0||r>=SIZE||c<0||c>=SIZE) continue;
      if (board[r][c] !== EMPTY) continue;
      const key = r + "," + c;
      if (set.has(key)) continue;
      set.add(key);
      out.push({ r, c });
    }
  }
  return out;
}

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

// 资源加载后重绘，避免首次空白
for (const k of Object.keys(images)) images[k].addEventListener("load", () => draw());

init();
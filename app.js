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

// ====================== Stronger AI (Alpha-Beta + Pattern Eval) ======================

// 可调参数：越大越强，但越慢。建议 3 起步
const AI_DEPTH = 3;

// 限制分支数：越大越强，但越慢（浏览器性能关键）
const ROOT_BRANCH = 20;
const INNER_BRANCH = 14;

// 评分表（可调）
const SCORE = {
  FIVE: 10000000,
  OPEN_FOUR: 250000,
  FOUR: 60000,
  OPEN_THREE: 12000,
  THREE: 3500,
  OPEN_TWO: 700,
  TWO: 220,
};

// ✅ 关键开关：是否把“活三(01110)”当作必须堵的威胁
const MUST_BLOCK_OPEN_THREE = true;

function aiPickMove(aiColor) {
  const opp = aiColor === BLACK ? WHITE : BLACK;

  const candidates = genCandidatesNeighborhood(2);
  if (candidates.length === 0) return { r: 9, c: 9 };

  // 0) 我方一手成五：直接下
  for (const p of candidates) {
    board[p.r][p.c] = aiColor;
    const win = checkWin(p.r, p.c, aiColor);
    board[p.r][p.c] = EMPTY;
    if (win) return p;
  }

  // 1) 对手一手成五：必须堵
  for (const p of candidates) {
    board[p.r][p.c] = opp;
    const win = checkWin(p.r, p.c, opp);
    board[p.r][p.c] = EMPTY;
    if (win) return p;
  }

  // 2) ✅ 必须防的威胁：活四/冲四/双活三/（可选：单活三）
  const block = findUrgentBlock(aiColor);
  if (block) return block;

  // 3) 我方优先制造强威胁：活四/冲四/双活三
  const attack = findUrgentAttack(aiColor);
  if (attack) return attack;

  // 4) alpha-beta 搜索（在战术过滤之后做）
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

// Negamax alpha-beta：side 为当前下子方，aiColor 为评估视角
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

    // 直接胜利：立即返回极值
    if (checkWin(p.r, p.c, side)) {
      board[p.r][p.c] = EMPTY;
      return side === aiColor ? SCORE.FIVE : -SCORE.FIVE;
    }

    const val = -alphaBeta(depth - 1, -beta, -alpha, opp, aiColor);
    board[p.r][p.c] = EMPTY;

    if (val > alpha) alpha = val;
    if (alpha >= beta) break; // 剪枝
  }

  return alpha;
}

// 候选点：已有棋子周围 radius 范围内的空点
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

// 快速点评估：临时落子看威胁
function quickPointHeuristic(r, c, side) {
  if (board[r][c] !== EMPTY) return -Infinity;
  board[r][c] = side;
  const s = evaluatePoint(r, c, side);
  board[r][c] = EMPTY;
  return s;
}

// 全局评估：aiColor 视角（ai越大越好）
// 只评候选点（加速）
function evaluateBoard(aiColor) {
  const opp = aiColor === BLACK ? WHITE : BLACK;

  let aiScore = 0;
  let oppScore = 0;

  const cand = genCandidatesNeighborhood(2);
  for (const p of cand) {
    aiScore += potentialAt(p.r, p.c, aiColor);
    oppScore += potentialAt(p.r, p.c, opp);
  }

  // 防守略优先
  return aiScore - oppScore * 1.07;
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

// 以 (r,c) 为中心取 9 格，映射：我方=1 空=0 对方/边界=2
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

// 模式评分（简化但有效）
function scoreLine(line) {
  if (line.includes("11111")) return SCORE.FIVE;

  // 活四
  if (line.includes("011110")) return SCORE.OPEN_FOUR;

  // 冲四 / 眠四
  if (
    line.includes("211110") || line.includes("011112") ||
    line.includes("10111")  || line.includes("11101")  || line.includes("11011")
  ) return SCORE.FOUR;

  // 活三
  if (
    line.includes("01110") || line.includes("010110") || line.includes("011010")
  ) return SCORE.OPEN_THREE;

  // 眠三
  if (
    line.includes("21110") || line.includes("01112") ||
    line.includes("01011") || line.includes("11010") ||
    line.includes("10110") || line.includes("01101")
  ) return SCORE.THREE;

  // 活二
  if (
    line.includes("001100") || line.includes("0010100") || line.includes("010100")
  ) return SCORE.OPEN_TWO;

  // 眠二
  if (
    line.includes("21100") || line.includes("00112") ||
    line.includes("01010") || line.includes("01100")
  ) return SCORE.TWO;

  return 0;
}

function findUrgentBlock(aiColor) {
  const opp = aiColor === BLACK ? WHITE : BLACK;
  const candidates = genCandidatesNeighborhood(2);

  for (const p of candidates) {
    // 模拟对手在 p 落子
    board[p.r][p.c] = opp;

    // 1) 对手直接赢（成五）
    if (checkWin(p.r, p.c, opp)) {
      board[p.r][p.c] = EMPTY;
      return p;
    }

    // 2) 对手落子后形成的威胁类型
    const t = threatLevelAt(p.r, p.c, opp);

    board[p.r][p.c] = EMPTY;

    // 必须挡：活四/冲四/双活三
    if (t.openFour > 0 || t.four > 0 || t.doubleOpenThree) {
      return p;
    }

    // ✅ 新增：单活三也当作必须挡（解决“三个子连线必须堵”）
    if (MUST_BLOCK_OPEN_THREE && t.openThree > 0) {
      return p;
    }
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

    // 优先级：活四 > 冲四 > 双活三
    if (t.openFour > 0) return p;
    if (t.four > 0) return p;
    if (t.doubleOpenThree) return p;
  }
  return null;
}

// 识别某一步落子后，在四个方向上产生的威胁计数
function threatLevelAt(r, c, color) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  let openFour = 0;
  let four = 0;
  let openThree = 0;

  for (const [dr, dc] of dirs) {
    const line = getLine(r, c, dr, dc, color);

    // 活四
    if (line.includes("011110")) openFour++;

    // 冲四/眠四（简化覆盖）
    if (
      line.includes("211110") || line.includes("011112") ||
      line.includes("10111")  || line.includes("11101")  || line.includes("11011")
    ) four++;

    // 活三（01110 / 010110 / 011010）
    if (
      line.includes("01110") || line.includes("010110") || line.includes("011010")
    ) openThree++;
  }

  return {
    openFour,
    four,
    openThree,
    doubleOpenThree: openThree >= 2
  };
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
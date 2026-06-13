export const BOARD_SIZE = 6;

export const LEVELS = [
  { rank: 1, value: 1, label: "普通", color: "#FFF2D8" },
  { rank: 2, value: 3, label: "优秀", color: "#9EE4AE" },
  { rank: 3, value: 9, label: "稀有", color: "#70CFFF" },
  { rank: 4, value: 27, label: "精良", color: "#8DBBFF" },
  { rank: 5, value: 81, label: "史诗", color: "#C995FF" },
  { rank: 6, value: 243, label: "传说", color: "#FFB65C" },
  { rank: 7, value: 729, label: "神话", color: "#FF7D8D" },
  { rank: 8, value: 2187, label: "远古", color: "#FFE15F" },
  { rank: 9, value: 6561, label: "至尊", color: "#66FFE3" },
  { rank: 10, value: 19683, label: "创世", color: "purple-pink" },
  { rank: 11, value: 59049, label: "万物", color: "gold" },
];

export function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null));
}

export function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export function getLevel(value) {
  return LEVELS.find((level) => level.value === value) ?? LEVELS[0];
}

export function upgradeValue(value) {
  const index = LEVELS.findIndex((level) => level.value === value);
  if (index < 0) return value;
  return LEVELS[Math.min(index + 1, LEVELS.length - 1)].value;
}

export function getSpawnOptions(highestCreated = 0) {
  if (highestCreated >= 2187) {
    return [
      { value: 1, weight: 68 },
      { value: 3, weight: 20 },
      { value: 9, weight: 8.5 },
      { value: 27, weight: 2.8 },
      { value: 81, weight: 0.5 },
      { value: 243, weight: 0.2 },
    ];
  }

  if (highestCreated >= 729) {
    return [
      { value: 1, weight: 69 },
      { value: 3, weight: 20 },
      { value: 9, weight: 8 },
      { value: 27, weight: 2.5 },
      { value: 81, weight: 0.4 },
      { value: 243, weight: 0.1 },
    ];
  }

  if (highestCreated >= 243) {
    return [
      { value: 1, weight: 71 },
      { value: 3, weight: 20 },
      { value: 9, weight: 7 },
      { value: 27, weight: 1.7 },
      { value: 81, weight: 0.3 },
    ];
  }

  if (highestCreated >= 81) {
    return [
      { value: 1, weight: 73 },
      { value: 3, weight: 20 },
      { value: 9, weight: 6 },
      { value: 27, weight: 1 },
    ];
  }

  if (highestCreated >= 27) {
    return [
      { value: 1, weight: 75 },
      { value: 3, weight: 20 },
      { value: 9, weight: 5 },
    ];
  }

  if (highestCreated >= 9) {
    return [
      { value: 1, weight: 80 },
      { value: 3, weight: 20 },
    ];
  }

  return [
    { value: 1, weight: 100 },
  ];
}

export function generateTile(random = Math.random(), highestCreated = 0) {
  const options = getSpawnOptions(highestCreated);
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  const roll = Math.min(Math.max(random, 0), 0.999999);
  const target = roll * totalWeight;
  let cursor = 0;

  for (const option of options) {
    cursor += option.weight;
    if (target < cursor) return option.value;
  }

  return options[options.length - 1].value;
}

export function isBoardFull(board) {
  return board.every((row) => row.every((cell) => cell !== null));
}

export function findConnectedGroup(board, row, col) {
  const value = board[row]?.[col];
  if (value === null || value === undefined) return [];

  const seen = new Set();
  const queue = [{ row, col }];
  const group = [];

  while (queue.length > 0) {
    const current = queue.shift();
    const key = `${current.row}:${current.col}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (board[current.row]?.[current.col] !== value) continue;
    group.push(current);

    for (const [rowOffset, colOffset] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nextRow = current.row + rowOffset;
      const nextCol = current.col + colOffset;
      if (nextRow >= 0 && nextRow < BOARD_SIZE && nextCol >= 0 && nextCol < BOARD_SIZE) {
        queue.push({ row: nextRow, col: nextCol });
      }
    }
  }

  return group;
}

export function placeTileAndResolve(board, row, col, value) {
  if (board[row]?.[col] !== null) {
    throw new Error("目标格子已经有数字");
  }

  const nextBoard = cloneBoard(board);
  nextBoard[row][col] = value;
  return resolveBoardFrom(nextBoard, row, col);
}

function pickMergeCells(group, anchor) {
  return [
    anchor,
    ...group
      .filter((cell) => cell.row !== anchor.row || cell.col !== anchor.col)
      .sort((a, b) => {
        const distanceA = Math.abs(a.row - anchor.row) + Math.abs(a.col - anchor.col);
        const distanceB = Math.abs(b.row - anchor.row) + Math.abs(b.col - anchor.col);
        if (distanceA !== distanceB) return distanceA - distanceB;
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      })
      .slice(0, 2),
  ];
}

export function resolveBoardFrom(board, row, col) {
  const nextBoard = cloneBoard(board);
  let scoreGain = 0;
  let combo = 0;
  const events = [];
  let anchor = { row, col };

  while (true) {
    const currentValue = nextBoard[anchor.row][anchor.col];
    if (currentValue === LEVELS[LEVELS.length - 1].value) break;

    const group = findConnectedGroup(nextBoard, anchor.row, anchor.col);
    if (group.length < 3) break;

    combo += 1;
    const nextValue = upgradeValue(currentValue);
    const removed = pickMergeCells(group, anchor);
    for (const cell of removed) {
      nextBoard[cell.row][cell.col] = null;
    }
    nextBoard[anchor.row][anchor.col] = nextValue;

    const mergeScore = nextValue;
    scoreGain += mergeScore;
    events.push({
      combo,
      from: currentValue,
      to: nextValue,
      removed,
      score: mergeScore,
      anchor,
    });
  }

  return { board: nextBoard, scoreGain, events };
}

export function applyRecycle(board, row, col) {
  const value = board[row]?.[col];
  if (value === null || value === undefined) {
    return null;
  }

  const nextBoard = cloneBoard(board);
  nextBoard[row][col] = null;
  return nextBoard;
}

export function applyUpgrade(board, row, col) {
  const value = board[row]?.[col];
  if (value === null || value === undefined) {
    return null;
  }

  const nextBoard = cloneBoard(board);
  nextBoard[row][col] = upgradeValue(value);
  return resolveBoardFrom(nextBoard, row, col);
}

export function applyBomb(board, row, col) {
  const value = board[row]?.[col];
  if (value === null || value === undefined) {
    return null;
  }

  const nextBoard = cloneBoard(board);
  nextBoard[row][col] = null;
  return nextBoard;
}

export function maxBoardValue(board) {
  return board.flat().reduce((max, value) => Math.max(max, value ?? 0), 0);
}

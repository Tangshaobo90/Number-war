import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LEVELS,
  applyBomb,
  applyRecycle,
  applyUpgrade,
  createEmptyBoard,
  findConnectedGroup,
  generateTile,
  getSpawnOptions,
  placeTileAndResolve,
  upgradeValue,
} from "../src/gameLogic.mjs";

describe("数字生成", () => {
  it("棋盘出现 9 之前，只随机生成 1", () => {
    assert.deepEqual(getSpawnOptions(0), [{ value: 1, weight: 100 }]);
    assert.deepEqual(getSpawnOptions(3), [{ value: 1, weight: 100 }]);
    assert.equal(generateTile(0, 0), 1);
    assert.equal(generateTile(0.999, 3), 1);
  });

  it("棋盘出现 9 后才解锁 3，概率为 20%", () => {
    assert.deepEqual(getSpawnOptions(9), [
      { value: 1, weight: 80 },
      { value: 3, weight: 20 },
    ]);
    assert.equal(generateTile(0.799, 9), 1);
    assert.equal(generateTile(0.8, 9), 3);
    assert.equal(generateTile(0.999, 9), 3);
  });

  it("棋盘最高数字为 27 时，低概率生成 9", () => {
    assert.deepEqual(getSpawnOptions(27), [
      { value: 1, weight: 75 },
      { value: 3, weight: 20 },
      { value: 9, weight: 5 },
    ]);
    assert.equal(generateTile(0.749, 27), 1);
    assert.equal(generateTile(0.75, 27), 3);
    assert.equal(generateTile(0.949, 27), 3);
    assert.equal(generateTile(0.95, 27), 9);
  });

  it("棋盘最高数字越高，按指定奖励池生成但不超过 243", () => {
    assert.equal(generateTile(0.729, 81), 1);
    assert.equal(generateTile(0.73, 81), 3);
    assert.equal(generateTile(0.929, 81), 3);
    assert.equal(generateTile(0.93, 81), 9);
    assert.equal(generateTile(0.99, 81), 27);

    assert.equal(generateTile(0.909, 243), 3);
    assert.equal(generateTile(0.91, 243), 9);
    assert.equal(generateTile(0.98, 243), 27);
    assert.equal(generateTile(0.997, 243), 81);

    assert.equal(generateTile(0.999, 729), 243);
    assert.equal(generateTile(0.998, 2187), 243);
  });

  it("即使棋盘最高数字很高，也不会随机生成 729 以上", () => {
    assert.equal(generateTile(0.999, 59049), 243);
  });
});

describe("合成规则", () => {
  it("只检测上下左右连通，不把对角线算作同组", () => {
    const board = createEmptyBoard();
    board[0][0] = 1;
    board[1][1] = 1;
    board[2][2] = 1;

    assert.deepEqual(findConnectedGroup(board, 0, 0), [{ row: 0, col: 0 }]);
  });

  it("三个相同数字在最后放置格升级，并支持连续连锁", () => {
    const board = createEmptyBoard();
    board[2][1] = 1;
    board[1][2] = 1;
    board[2][3] = 3;
    board[3][2] = 3;

    const result = placeTileAndResolve(board, 2, 2, 1);

    assert.equal(result.board[2][2], 9);
    assert.equal(result.board[2][1], null);
    assert.equal(result.board[1][2], null);
    assert.equal(result.board[2][3], null);
    assert.equal(result.board[3][2], null);
    assert.deepEqual(result.events.map((event) => event.to), [3, 9]);
    assert.equal(result.scoreGain, 3 + 9);
  });

  it("连通数量超过 3 时只消除 3 个，保留多余同数字", () => {
    const board = createEmptyBoard();
    board[2][1] = 1;
    board[1][2] = 1;
    board[2][3] = 1;

    const result = placeTileAndResolve(board, 2, 2, 1);

    assert.equal(result.board[2][2], 3);
    assert.equal(result.board[2][1], null);
    assert.equal(result.board[1][2], null);
    assert.equal(result.board[2][3], 1);
    assert.equal(result.scoreGain, 3);
  });

  it("59049 是最高等级，不继续升级", () => {
    assert.equal(upgradeValue(59049), 59049);
    assert.equal(LEVELS[LEVELS.length - 1].value, 59049);
  });
});

describe("计分", () => {
  it("普通放置不加分", () => {
    const board = createEmptyBoard();

    const result = placeTileAndResolve(board, 0, 0, 1);

    assert.equal(result.scoreGain, 0);
  });
});

describe("颜色规则", () => {
  it("每个等级都有指定颜色或高级渐变标记", () => {
    assert.deepEqual(
      LEVELS.map((level) => [level.value, level.color]),
      [
        [1, "#FFF2D8"],
        [3, "#9EE4AE"],
        [9, "#70CFFF"],
        [27, "#8DBBFF"],
        [81, "#C995FF"],
        [243, "#FFB65C"],
        [729, "#FF7D8D"],
        [2187, "#FFE15F"],
        [6561, "#66FFE3"],
        [19683, "purple-pink"],
        [59049, "gold"],
      ]
    );
  });
});

describe("道具规则", () => {
  it("铲子会删除目标数字，不影响其他格", () => {
    const board = createEmptyBoard();
    board[2][2] = 81;
    board[2][3] = 9;

    const result = applyRecycle(board, 2, 2);

    assert.equal(result[2][2], null);
    assert.equal(result[2][3], 9);
    assert.equal(board[2][2], 81);
  });

  it("魔法棒会让目标格升一级，并从该格继续检测合成加分", () => {
    const board = createEmptyBoard();
    board[1][1] = 1;
    board[1][2] = 3;
    board[2][1] = 3;

    const result = applyUpgrade(board, 1, 1);

    assert.equal(result.board[1][1], 9);
    assert.equal(result.board[1][2], null);
    assert.equal(result.board[2][1], null);
    assert.equal(result.scoreGain, 9);
    assert.deepEqual(result.events.map((event) => event.to), [9]);
  });

  it("魔法棒不能作用在空格上", () => {
    const board = createEmptyBoard();

    assert.equal(applyUpgrade(board, 0, 0), null);
  });

  it("炸弹只清除点击的一个数字，不影响周围格", () => {
    const board = createEmptyBoard();
    board[0][0] = 1;
    board[0][1] = 3;
    board[1][1] = 9;
    board[2][2] = 27;

    const result = applyBomb(board, 0, 0);

    assert.equal(result[0][0], null);
    assert.equal(result[0][1], 3);
    assert.equal(result[1][1], 9);
    assert.equal(result[2][2], 27);
  });

  it("炸弹点击空格无效", () => {
    const board = createEmptyBoard();
    board[0][1] = 3;

    const result = applyBomb(board, 0, 0);

    assert.equal(result, null);
    assert.equal(board[0][1], 3);
  });
});

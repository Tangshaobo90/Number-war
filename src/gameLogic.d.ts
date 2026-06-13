export const BOARD_SIZE: number;
export type TileValue = number | null;
export type Board = TileValue[][];
export type Level = {
  rank: number;
  value: number;
  label: string;
  color: string;
};
export type Cell = { row: number; col: number };
export type MergeEvent = {
  combo: number;
  from: number;
  to: number;
  removed: Cell[];
  score: number;
  anchor: Cell;
};

export const LEVELS: Level[];
export function createEmptyBoard(): Board;
export function cloneBoard(board: Board): Board;
export function getLevel(value: number): Level;
export function upgradeValue(value: number): number;
export function getSpawnOptions(highestCreated?: number): { value: number; weight: number }[];
export function generateTile(random?: number, highestCreated?: number): number;
export function isBoardFull(board: Board): boolean;
export function findConnectedGroup(board: Board, row: number, col: number): Cell[];
export function placeTileAndResolve(
  board: Board,
  row: number,
  col: number,
  value: number
): { board: Board; scoreGain: number; events: MergeEvent[] };
export function resolveBoardFrom(
  board: Board,
  row: number,
  col: number
): { board: Board; scoreGain: number; events: MergeEvent[] };
export function applyRecycle(board: Board, row: number, col: number): Board | null;
export function applyUpgrade(
  board: Board,
  row: number,
  col: number
): { board: Board; scoreGain: number; events: MergeEvent[] } | null;
export function applyBomb(board: Board, row: number, col: number): Board | null;
export function maxBoardValue(board: Board): number;

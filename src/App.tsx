import { useEffect, useMemo, useState } from "react";
import {
  type Board,
  type MergeEvent,
  applyBomb,
  applyRecycle,
  applyUpgrade,
  createEmptyBoard,
  generateTile,
  getLevel,
  isBoardFull,
  maxBoardValue,
  placeTileAndResolve,
} from "./gameLogic.mjs";

type Tool = "undo" | "shovel" | "wand" | "bomb";
type Mode = Exclude<Tool, "undo"> | null;

type GameSnapshot = {
  board: Board;
  score: number;
  main: number;
  reserve: number;
  highest: number;
  tools: Record<Tool, boolean>;
};

type RecordState = {
  highScore: number;
  highestTile: number;
  games: number;
  totalSeconds: number;
};

type EffectState = {
  tool: Tool | null;
  cells: Set<string>;
};

const STORAGE_KEY = "tang-shaobo-number-war-record";
const TOOL_LABELS: Record<Tool, string> = {
  undo: "撤销",
  shovel: "铲子",
  wand: "魔法棒",
  bomb: "炸弹",
};
const TOOL_ICONS: Record<Tool, string> = {
  undo:
    '<svg width="74" height="46" viewBox="0 0 74 46" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M45.0646 0V11.4424C61.4592 15.1451 69.8945 29.6083 72.9611 44.3826L73.2311 45.7695C66.5122 35.5858 57.221 30.6655 46.5933 28.8485L45.0692 28.6059V40.0483L22.4179 21.7588L45.0646 0ZM27.1459 7.32311L10.1974 22.8847L30.2887 38.0954H19.8029L0 22.8847L17.8501 7.32311H27.1459Z" fill="white"/></svg>',
  shovel:
    '<svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M34.4161 15.7605L28.6077 19.6636L35.9914 27.0486L39.8945 21.2402L34.4161 15.7605ZM25.6354 22.8528L19.0528 16.2715C18.9109 16.1271 18.7245 16.0349 18.5236 16.0097C18.3227 15.9845 18.1192 16.0279 17.9461 16.1328C-2.40382 28.2195 -3.0997 43.7728 4.32001 51.2528C11.7667 58.7611 27.3918 58.1359 39.5235 37.7102C39.6287 37.5369 39.6723 37.3332 39.6471 37.132C39.6219 36.9309 39.5295 36.7442 39.3848 36.6022L32.8022 30.0209L24.9344 37.8886L18.1323 37.524L17.7677 30.7219L25.6354 22.8528ZM11.6023 49.0265C11.3839 48.9024 11.1257 48.8681 10.8825 48.931C10.6392 48.9939 10.43 49.149 10.2992 49.3634C10.1683 49.5779 10.1261 49.8349 10.1815 50.08C10.2368 50.3251 10.3854 50.539 10.5957 50.6764C10.6086 50.6841 14.9533 53.3739 19.1594 51.2721C19.2727 51.215 19.3737 51.1362 19.4565 51.0401C19.5393 50.944 19.6024 50.8326 19.6422 50.7121C19.682 50.5916 19.6976 50.4645 19.6882 50.338C19.6789 50.2114 19.6447 50.088 19.5876 49.9747C19.5305 49.8614 19.4517 49.7605 19.3556 49.6776C19.2595 49.5948 19.1481 49.5317 19.0276 49.4919C18.9071 49.4522 18.78 49.4365 18.6535 49.4459C18.5269 49.4553 18.4035 49.4895 18.2902 49.5465C15.0573 51.1643 11.6139 49.033 11.6023 49.0265ZM40.5814 20.5546L35.1017 15.0749L47.3938 0.878724C48.8382 -0.790356 52.3882 0.178995 54.0316 1.62339C55.4773 3.26679 56.4454 6.81808 54.7776 8.26119L40.5814 20.5546ZM41.4866 12.8049C41.3145 12.9877 41.2205 13.2303 41.2243 13.4813C41.2281 13.7322 41.3295 13.9719 41.5069 14.1494C41.6844 14.3268 41.924 14.4282 42.175 14.432C42.426 14.4358 42.6686 14.3418 42.8514 14.1697L50.3879 6.63448C50.4775 6.54478 50.5486 6.43831 50.597 6.32115C50.6455 6.20399 50.6704 6.07842 50.6704 5.95163C50.6703 5.82484 50.6453 5.6993 50.5967 5.58218C50.5481 5.46506 50.4769 5.35866 50.3872 5.26905C50.2976 5.17943 50.1911 5.10836 50.0739 5.0599C49.9568 5.01143 49.8312 4.98652 49.7044 4.98658C49.5776 4.98664 49.4521 5.01167 49.3349 5.06025C49.2178 5.10882 49.1114 5.17999 49.0218 5.26969L41.4866 12.8049Z" fill="white"/><path d="M28.7197 21.1438L18.7617 31.1005L19.057 36.6008L24.5573 36.8961L34.5153 26.9394L28.7197 21.1438Z" fill="white"/></svg>',
  wand:
    '<svg width="55" height="57" viewBox="0 0 55 57" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M42.9078 27.2576C43.1913 26.9711 43.3913 26.5994 43.4576 26.1784C43.5884 25.3381 43.1798 24.517 42.4307 24.1303L30.0495 17.7375L32.2012 3.82645C32.3297 2.98643 31.9811 2.23127 31.2314 1.84655C30.4816 1.46274 29.7172 1.7552 29.1231 2.3563L19.5983 11.9923L6.81206 5.79596C6.06202 5.40956 5.02495 5.4275 4.42919 6.0296L4.46494 6.0671C3.87048 6.66889 3.79807 7.66388 4.18012 8.42301L10.3276 21.5235L0.798205 31.0142C0.204739 31.6153 -0.0851947 32.3894 0.294944 33.1478C0.674471 33.9063 1.3489 34.1859 2.17937 34.0564L15.9692 31.911L22.3269 44.487C22.7095 45.2444 23.5314 45.6664 24.3618 45.5329C24.777 45.4667 25.1479 45.2686 25.4314 44.9811C25.7147 44.6949 25.9114 44.3206 25.9768 43.9006L28.1588 30.0322L41.8395 27.8055C42.2534 27.7384 42.625 27.5442 42.9078 27.2576ZM33.8917 31.371L31.8597 31.7952C30.8133 31.9237 29.8336 32.7758 29.6659 33.8404L29.3932 35.5729L46.5669 55.2891C47.5154 56.3781 49.056 56.695 50.3374 56.056C51.0384 55.7065 51.7638 55.2577 52.3003 54.7137C53.0121 53.9915 53.611 53.0408 54.0725 52.1633C54.7824 50.8129 54.4498 49.1352 53.3033 48.1473L33.8917 31.371ZM46.6289 11.1114C46.6413 11.0324 46.6308 10.9506 46.5938 10.8761C46.5195 10.7282 46.3626 10.6473 46.2009 10.6747L43.5285 11.13L42.2982 8.68331C42.2235 8.53583 42.0832 8.45784 41.9218 8.48588C41.7605 8.51391 41.6728 8.65032 41.647 8.81515L41.2331 11.4592L38.5188 11.9934C38.3572 12.0212 38.1958 12.1465 38.1696 12.3116L38.1795 12.3136C38.154 12.4784 38.2547 12.6439 38.4005 12.7183L40.8474 14.0566L40.4163 16.6784C40.3904 16.8433 40.4322 16.9995 40.5776 17.074C40.7231 17.1487 40.8609 17.1132 40.9773 16.9947L42.9086 15.0272L45.3294 16.2582C45.4752 16.3323 45.6521 16.3016 45.7679 16.1825C45.826 16.1231 45.862 16.0481 45.8745 15.9691C45.8866 15.8908 45.8755 15.8086 45.8384 15.7345L44.6176 13.2911L46.5225 11.3239C46.58 11.2645 46.6167 11.1898 46.6289 11.1114ZM22.7938 2.22898C22.804 2.16238 22.7954 2.09287 22.7638 2.02986C22.701 1.90452 22.568 1.83601 22.4309 1.85915L20.1666 2.24486L19.1241 0.171938C19.061 0.0469052 18.9424 -0.0190103 18.8056 0.00481997C18.6688 0.0286503 18.5945 0.144212 18.5728 0.283833L18.222 2.52388L15.9223 2.9765C15.7852 2.99995 15.6484 3.10604 15.6264 3.24604L15.635 3.24765C15.613 3.38727 15.6985 3.52735 15.8219 3.59066L17.8951 4.72466L17.53 6.94577C17.5083 7.08539 17.5433 7.2176 17.6668 7.28092C17.7899 7.34424 17.9066 7.31414 18.0051 7.21371L19.6414 5.54673L21.6926 6.58969C21.816 6.65232 21.9659 6.62658 22.0641 6.52538C22.1132 6.47512 22.1439 6.4115 22.1544 6.34489C22.1646 6.27837 22.1554 6.20848 22.1238 6.14585L21.0895 4.07582L22.7032 2.40885C22.7523 2.35882 22.7832 2.29558 22.7938 2.22898ZM3.29618 16.1323C3.26525 16.0921 3.22286 16.0612 3.17275 16.0464C3.07232 16.0177 2.96645 16.0579 2.90841 16.1479L1.95077 17.6347L0.287382 17.1593C0.186943 17.1308 0.0899425 17.1644 0.0322763 17.2546C-0.0251608 17.3446 -0.000566914 17.4461 0.0638206 17.5307L1.09998 18.885L0.160516 20.4264C0.102468 20.5164 0.0897128 20.6489 0.154482 20.7338L0.159599 20.7295C0.224369 20.8141 0.34459 20.8375 0.442508 20.8L2.12728 20.2051L3.14556 21.5578C3.20995 21.6423 3.30023 21.6903 3.39815 21.6527C3.49607 21.6152 3.53976 21.5333 3.53594 21.4256L3.47407 19.6355L5.09758 19.0063C5.1955 18.9684 5.25867 18.8699 5.25447 18.7619C5.25225 18.7081 5.23338 18.6578 5.20245 18.6176C5.17182 18.5772 5.12913 18.5468 5.07872 18.5322L3.42106 18.0537L3.34774 16.2765C3.34529 16.2226 3.32712 16.1724 3.29618 16.1323Z" fill="white"/></svg>',
  bomb:
    '<svg width="65" height="54" viewBox="0 0 65 54" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M20.9297 53.2402C9.29831 53.1684 -0.0713886 43.7628 0.000409892 32.2032C0.0363091 20.7514 9.44191 11.4535 20.9297 11.4894C32.5251 11.5253 41.8589 21.0745 41.7871 32.8853C41.7512 44.05 32.2379 53.312 20.9297 53.2402ZM36.0073 31.0903C34.7868 36.1521 32.0943 40.0651 27.8582 42.8294C23.5862 45.5936 18.9193 46.3116 13.7857 45.45C17.5192 48.7528 24.376 49.5066 29.8686 45.9167C34.715 42.7217 37.5869 36.6188 36.0073 31.0903ZM54.9262 7.54045C55.6801 8.04304 56.3622 8.47383 57.0084 8.90463C54.3159 13.1407 48.3926 13.1766 45.5565 9.08412C45.0539 8.36614 44.659 7.61225 44.1206 6.93017C42.0384 4.34542 38.4844 4.70442 36.8689 7.71995C37.7664 8.25844 38.6998 8.79693 39.5973 9.37131C41.105 10.3047 41.464 11.5253 40.5665 13.0689C39.8844 14.2895 39.1306 15.5101 38.3049 16.8384C35.074 13.2484 31.1609 10.9509 26.4222 9.73031C27.3556 8.18664 28.1454 6.75067 29.0788 5.3865C29.7609 4.41722 30.9096 4.23773 32.0943 4.81211C32.8482 5.17111 33.5662 5.6378 34.3919 6.10449C34.6791 5.70959 34.9663 5.3147 35.2534 4.95571C38.0536 1.43759 43.2949 1.40169 46.095 4.91981C46.5617 5.4942 46.9566 6.10449 47.3515 6.71477C49.4336 9.76621 52.1979 10.0893 54.9262 7.54045ZM63.0035 11.9561C61.3881 11.9202 60.7419 11.4894 60.7778 10.4842C60.8137 9.58671 61.3522 9.19182 62.2138 9.22772C63.8292 9.26362 64.6549 9.76621 64.5831 10.7355C64.5113 11.7048 63.9369 12.0279 63.0035 11.9561ZM57.6187 1.0068C57.5469 2.98125 56.9007 3.87873 55.9314 3.77104C55.0698 3.66334 54.6749 3.08895 54.7108 2.26327C54.7467 0.8273 55.4647 -0.213778 56.3981 0.0375167C56.9366 0.181114 57.3674 0.791401 57.6187 1.0068ZM59.3418 5.6378C59.5213 4.45312 60.7419 3.30435 61.7112 3.34025C62.501 3.37614 63.0035 3.77104 62.9676 4.63262C62.9676 5.4224 61.7112 6.60707 60.8496 6.49938C60.3111 6.39168 59.8444 5.92499 59.3418 5.6378Z" fill="white"/></svg>',
};

const AUDIO_FILES = {
  click: "click.mp3",
  swap: "swap.mp3",
  place: "place.mp3",
  merge: "merge.mp3",
  newMerge: "new-merge.mp3",
  fail: "fail.mp3",
  restart: "restart.mp3",
  undo: "undo.mp3",
  shovel: "shovel.mp3",
  wand: "wand.mp3",
  bomb: "bomb.mp3",
} as const;

type SoundName = keyof typeof AUDIO_FILES;
type AudioPool = {
  items: HTMLAudioElement[];
  index: number;
};
type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const AUDIO_POOL_SIZE = 4;
const audioPools = new Map<SoundName, AudioPool>();
const audioBuffers = new Map<SoundName, AudioBuffer>();
const audioBufferPromises = new Map<SoundName, Promise<AudioBuffer | null>>();
let audioContext: AudioContext | null = null;

function audioPath(file: string) {
  return `${window.location.protocol === "file:" ? "./public/audio/" : "/audio/"}${file}`;
}

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as AudioWindow).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

function unlockAudioContext() {
  const context = getAudioContext();
  if (!context || context.state !== "suspended") return;
  void context.resume().catch(() => {});
}

function loadAudioBuffer(name: SoundName) {
  if (typeof window === "undefined" || window.location.protocol === "file:") {
    return Promise.resolve(null);
  }

  const cached = audioBuffers.get(name);
  if (cached) return Promise.resolve(cached);

  const pending = audioBufferPromises.get(name);
  if (pending) return pending;

  const promise = fetch(audioPath(AUDIO_FILES[name]))
    .then((response) => response.arrayBuffer())
    .then((data) => {
      const context = getAudioContext();
      if (!context) return null;
      return context.decodeAudioData(data);
    })
    .then((buffer) => {
      if (buffer) audioBuffers.set(name, buffer);
      return buffer;
    })
    .catch(() => null);

  audioBufferPromises.set(name, promise);
  return promise;
}

function playBufferedSound(name: SoundName) {
  const context = getAudioContext();
  const buffer = audioBuffers.get(name);
  if (!context || context.state !== "running" || !buffer) return false;

  const source = context.createBufferSource();
  const gain = context.createGain();
  gain.gain.value = 0.9;
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(context.destination);
  source.start(0);
  return true;
}

function createAudio(name: SoundName) {
  if (typeof Audio === "undefined") return null;
  const audio = new Audio(audioPath(AUDIO_FILES[name]));
  audio.preload = "auto";
  audio.volume = 0.9;
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  audio.load();
  return audio;
}

function getAudioPool(name: SoundName) {
  const cached = audioPools.get(name);
  if (cached) return cached;

  const items = Array.from({ length: AUDIO_POOL_SIZE }, () => createAudio(name)).filter(Boolean);
  if (items.length === 0) return null;

  const pool = { items, index: 0 } as AudioPool;
  audioPools.set(name, pool);
  return pool;
}

function preloadSounds() {
  (Object.keys(AUDIO_FILES) as SoundName[]).forEach((name) => {
    getAudioPool(name);
    void loadAudioBuffer(name);
  });
}

function setupAudioUnlockListeners() {
  const unlock = () => {
    unlockAudioContext();
    preloadSounds();
  };
  const options: AddEventListenerOptions = { capture: true, passive: true };

  window.addEventListener("pointerdown", unlock, options);
  window.addEventListener("touchstart", unlock, options);
  window.addEventListener("click", unlock, options);
  window.addEventListener("keydown", unlock, options);

  return () => {
    window.removeEventListener("pointerdown", unlock, options);
    window.removeEventListener("touchstart", unlock, options);
    window.removeEventListener("click", unlock, options);
    window.removeEventListener("keydown", unlock, options);
  };
}

function playSound(name: SoundName) {
  unlockAudioContext();
  preloadSounds();
  if (playBufferedSound(name)) return;

  const pool = getAudioPool(name);
  if (!pool) return;
  const audio = pool.items[pool.index];
  if (!audio) return;
  pool.index = (pool.index + 1) % pool.items.length;
  audio.muted = false;
  audio.volume = 0.9;
  if (audio.readyState === 0) audio.load();
  try {
    audio.currentTime = 0;
  } catch {
    // Some mobile browsers do not allow seeking before metadata is ready.
  }
  void audio.play().catch(() => {
    const fallback = createAudio(name);
    if (!fallback) return;
    fallback.muted = false;
    fallback.volume = 0.9;
    void fallback.play().catch(() => {});
  });
}

function playMergeSound(events: MergeEvent[], previousHighest: number) {
  if (events.length === 0) return;
  const madeNewHighest = events.some((event) => event.to > previousHighest);
  playSound(madeNewHighest ? "newMerge" : "merge");
}

function readRecord(): RecordState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { highScore: 0, highestTile: 0, games: 0, totalSeconds: 0 };
    return { highScore: 0, highestTile: 0, games: 0, totalSeconds: 0, ...JSON.parse(raw) };
  } catch {
    return { highScore: 0, highestTile: 0, games: 0, totalSeconds: 0 };
  }
}

function writeRecord(record: RecordState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

function makeSnapshot(
  board: Board,
  score: number,
  main: number,
  reserve: number,
  highest: number,
  tools: Record<Tool, boolean>
): GameSnapshot {
  return {
    board: board.map((row) => [...row]),
    score,
    main,
    reserve,
    highest,
    tools: { ...tools },
  };
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export default function App() {
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [score, setScore] = useState(0);
  const [highest, setHighest] = useState(0);
  const [main, setMain] = useState(() => generateTile(Math.random(), 0));
  const [reserve, setReserve] = useState(() => generateTile(Math.random(), 0));
  const [record, setRecord] = useState<RecordState>(() => readRecord());
  const [tools, setTools] = useState<Record<Tool, boolean>>({
    undo: false,
    shovel: false,
    wand: false,
    bomb: false,
  });
  const [mode, setMode] = useState<Mode>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [comboText, setComboText] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [effects, setEffects] = useState<EffectState>({ tool: null, cells: new Set() });
  const [showRules, setShowRules] = useState(true);
  const [undoConfirmOpen, setUndoConfirmOpen] = useState(false);

  const highScore = Math.max(record.highScore, score);
  const totalSeconds = record.totalSeconds + sessionSeconds;

  useEffect(() => {
    preloadSounds();
    return setupAudioUnlockListeners();
  }, []);

  useEffect(() => {
    if (gameOver || showRules) return undefined;
    const timer = window.setInterval(() => setSessionSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [gameOver, showRules]);

  useEffect(() => {
    const nextRecord = {
      ...record,
      highScore: Math.max(record.highScore, score),
      highestTile: Math.max(record.highestTile, highest),
    };
    writeRecord({ ...nextRecord, totalSeconds });
  }, [score, highest, totalSeconds]);

  const boardHighest = useMemo(() => Math.max(highest, maxBoardValue(board)), [board, highest]);

  function updateAfterBoardChange(nextBoard: Board, nextScore = score, events: MergeEvent[] = []) {
    const nextHighest = Math.max(boardHighest, maxBoardValue(nextBoard), ...events.map((event) => event.to));
    setHighest(nextHighest);
    setBoard(nextBoard);
    setScore(nextScore);
    const lastCombo = events.length > 0 ? events[events.length - 1].combo : 0;
    setComboText(lastCombo > 1 ? `Combo x${lastCombo}` : "");
    if (lastCombo > 1) {
      window.setTimeout(() => setComboText(""), 1200);
    }
  }

  function finishGame(finalBoard: Board, finalScore: number, finalHighest: number) {
    const nextRecord = {
      highScore: Math.max(record.highScore, finalScore),
      highestTile: Math.max(record.highestTile, finalHighest),
      games: record.games + 1,
      totalSeconds,
    };
    setRecord(nextRecord);
    writeRecord(nextRecord);
    setSessionSeconds(0);
    setGameOver(true);
  }

  function flashTool(tool: Tool, cells: { row: number; col: number }[] = []) {
    setEffects({
      tool,
      cells: new Set(cells.map((cell) => `${cell.row}:${cell.col}`)),
    });
    window.setTimeout(() => setEffects({ tool: null, cells: new Set() }), 520);
  }

  function placeTile(row: number, col: number) {
    if (gameOver || mode || board[row][col] !== null) return;

    const previousHighest = boardHighest;
    const before = makeSnapshot(board, score, main, reserve, boardHighest, tools);
    const result = placeTileAndResolve(board, row, col, main);
    const nextScore = score + result.scoreGain;
    const currentBoardHighest = maxBoardValue(result.board);
    const nextHighest = Math.max(boardHighest, currentBoardHighest, ...result.events.map((event) => event.to), main);
    const nextMain = reserve;
    const nextReserve = generateTile(Math.random(), currentBoardHighest);

    setSnapshot(before);
    setMain(nextMain);
    setReserve(nextReserve);
    updateAfterBoardChange(result.board, nextScore, result.events);
    if (result.events.length > 0) {
      playMergeSound(result.events, previousHighest);
    } else {
      playSound("place");
    }

    if (isBoardFull(result.board)) {
      playSound("fail");
      finishGame(result.board, nextScore, nextHighest);
    }
  }

  function swapNumbers() {
    if (gameOver) return;
    playSound("swap");
    setMode(null);
    setMain(reserve);
    setReserve(main);
  }

  function useUndo() {
    if (tools.undo || !snapshot || gameOver) return;
    playSound("undo");
    setBoard(snapshot.board);
    setScore(snapshot.score);
    setMain(snapshot.main);
    setReserve(snapshot.reserve);
    setHighest(snapshot.highest);
    setTools({ ...snapshot.tools, undo: true });
    setSnapshot(null);
    setMode(null);
    setComboText("");
    flashTool("undo");
  }

  function selectTool(tool: Tool) {
    if (tools[tool] || gameOver) return;
    playSound("click");
    if (tool === "undo") {
      if (!snapshot) return;
      setMode(null);
      setUndoConfirmOpen(true);
      return;
    }
    setMode((value) => (value === tool ? null : tool));
  }

  function confirmUndo() {
    setUndoConfirmOpen(false);
    useUndo();
  }

  function closeRules() {
    playSound("click");
    setShowRules(false);
  }

  function applyTool(row: number, col: number) {
    if (!mode || tools[mode] || gameOver) return;

    if (mode === "shovel") {
      const liftedValue = board[row][col];
      const nextBoard = applyRecycle(board, row, col);
      if (!nextBoard) return;
      setMain(liftedValue as number);
      setTools((value) => ({ ...value, shovel: true }));
      setMode(null);
      updateAfterBoardChange(nextBoard, score);
      playSound("shovel");
      flashTool("shovel", [{ row, col }]);
      return;
    }

    if (mode === "wand") {
      const result = applyUpgrade(board, row, col);
      if (!result) return;
      const nextScore = score + result.scoreGain;
      setTools((value) => ({ ...value, wand: true }));
      setMode(null);
      updateAfterBoardChange(result.board, nextScore, result.events);
      playSound("wand");
      playMergeSound(result.events, boardHighest);
      flashTool("wand", [{ row, col }, ...result.events.flatMap((event) => event.removed)]);
      return;
    }

    const nextBoard = applyBomb(board, row, col);
    if (!nextBoard) return;

    setTools((value) => ({ ...value, [mode]: true }));
    setMode(null);
    updateAfterBoardChange(nextBoard, score);
    playSound("bomb");
    flashTool("bomb", [{ row, col }]);
  }

  function restart() {
    playSound("restart");
    setBoard(createEmptyBoard());
    setScore(0);
    setHighest(0);
    setMain(generateTile(Math.random(), 0));
    setReserve(generateTile(Math.random(), 0));
    setTools({ undo: false, shovel: false, wand: false, bomb: false });
    setMode(null);
    setSnapshot(null);
    setComboText("");
    setGameOver(false);
    setUndoConfirmOpen(false);
    setSessionSeconds(0);
    setEffects({ tool: null, cells: new Set() });
  }

  function cellClass(value: number | null, rowIndex: number, colIndex: number) {
    const isEffect = effects.cells.has(`${rowIndex}:${colIndex}`);
    if (value === null) return ["cell empty", isEffect ? "effect" : ""].filter(Boolean).join(" ");
    const level = getLevel(value);
    return [
      "cell tile",
      `rank-${level.rank}`,
      isEffect ? "effect" : "",
      level.rank >= 6 ? "glow" : "",
      level.rank >= 7 ? "particle" : "",
      level.rank >= 8 ? "stream" : "",
      level.rank === 11 ? "crown" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function tileStyle(value: number | null) {
    if (value === null) return undefined;
    const level = getLevel(value);
    if (level.rank >= 10) return undefined;
    return { "--tile-color": level.color } as React.CSSProperties;
  }

  return (
    <main className="game-shell">
      <h1>
        唐少博的<span>数字战争</span>
      </h1>
      <div className="record-line" aria-label="成长记录">
        最高数字 {boardHighest || 0} · 总局数 {record.games} · 游戏时长 {formatTime(sessionSeconds)}
      </div>

      <section className="top-layout" aria-label="游戏状态">
        <div
          className="number-switch"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            swapNumbers();
          }}
          aria-label="数字切换区"
        >
          <span className="number-switch-title">点击切换</span>
          <button
            type="button"
            className={`preview rank-${getLevel(reserve).rank}`}
            style={tileStyle(reserve)}
            aria-label="点击小数字交换到大数字"
          >
            <span className="tile-number">{reserve}</span>
          </button>
          <button
            type="button"
            className={`current rank-${getLevel(main).rank}`}
            style={tileStyle(main)}
            aria-label="当前要放置的大数字，点击只和小数字交换"
          >
            <span className="tile-number">{main}</span>
          </button>
        </div>

        <div className="score-card score-current">
          <span>得分</span>
          <strong>{score}</strong>
        </div>

        <div className="score-card score-high">
          <span>高分</span>
          <strong>{highScore}</strong>
        </div>

        <section className="tools" aria-label="道具栏">
          {(Object.keys(TOOL_LABELS) as Tool[]).map((tool) => (
            <button
              key={tool}
              className={`tool tool-${tool} ${mode === tool ? "active" : ""} ${tools[tool] ? "used" : ""} ${
                effects.tool === tool ? "effect" : ""
              }`}
              onClick={() => selectTool(tool)}
              title={TOOL_LABELS[tool]}
              aria-label={TOOL_LABELS[tool]}
            >
              {!tools[tool] && <span className="badge">1</span>}
              <span className="tool-icon" dangerouslySetInnerHTML={{ __html: TOOL_ICONS[tool] }} />
            </button>
          ))}
        </section>
      </section>

      <section className="board-wrap" aria-label="6×6棋盘">
        {comboText && <div className="combo">{comboText}</div>}
        <div className="board">
          {board.map((row, rowIndex) =>
            row.map((value, colIndex) => (
              <button
                type="button"
                key={`${rowIndex}-${colIndex}`}
                className={cellClass(value, rowIndex, colIndex)}
                style={tileStyle(value)}
                data-row={rowIndex}
                data-col={colIndex}
                onClick={() => (mode ? applyTool(rowIndex, colIndex) : placeTile(rowIndex, colIndex))}
                aria-label={value === null ? "空格" : `${value}`}
              >
                {value !== null && <span className="tile-number">{value}</span>}
                {value === 59049 && <span className="crown-mark">♛</span>}
              </button>
            ))
          )}
        </div>
      </section>

      <button type="button" className="restart-button" onClick={restart}>
        重新开始
      </button>

      <footer>
        <strong>此游戏全程由AI实现</strong>
      </footer>

      {gameOver && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="游戏结束">
          <div className="modal">
            <h2>游戏结束</h2>
            <p>最终分数 {score}</p>
            <p>最高数字 {boardHighest || 0}</p>
            <p>历史最高 {Math.max(record.highScore, score)}</p>
            <button onClick={restart}>重新开始</button>
          </div>
        </div>
      )}

      {undoConfirmOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="确认撤销">
          <div className="modal confirm-modal">
            <h2>确认撤销</h2>
            <p>确定返回上一步吗？</p>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  playSound("click");
                  setUndoConfirmOpen(false);
                }}
              >
                取消
              </button>
              <button type="button" onClick={confirmUndo}>
                确定撤销
              </button>
            </div>
          </div>
        </div>
      )}

      {showRules && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="游戏规则">
          <div className="modal rules-modal">
            <h2>🎮 游戏规则</h2>
            <div className="rule-copy">
              <section className="rule-card">
                <p>① 点击空格放入当前数字</p>
                <p>② 点击左侧小数字可与当前数字交换</p>
                <p>③ 三个相同且相连数字自动升级</p>
                <p>3个1 = 3</p>
                <p>3个3 = 9</p>
                <p>3个9 = 27</p>
                <p>继续向上合成更高等级！</p>
              </section>
              <section className="rule-card">
                <div className="rule-tool">
                  <span className="rule-tool-icon" dangerouslySetInnerHTML={{ __html: TOOL_ICONS.shovel }} />
                  <span>铲子：撤回数字</span>
                </div>
                <div className="rule-tool">
                  <span className="rule-tool-icon" dangerouslySetInnerHTML={{ __html: TOOL_ICONS.wand }} />
                  <span>魔法棒：升级数字</span>
                </div>
                <div className="rule-tool">
                  <span className="rule-tool-icon" dangerouslySetInnerHTML={{ __html: TOOL_ICONS.bomb }} />
                  <span>炸弹：清除数字</span>
                </div>
                <div className="rule-tool">
                  <span className="rule-tool-icon" dangerouslySetInnerHTML={{ __html: TOOL_ICONS.undo }} />
                  <span>撤销：返回上一步</span>
                </div>
                <p>每局各使用1次</p>
              </section>
              <section className="rule-card">
                <p>棋盘放满游戏结束</p>
                <p>目标：合成最高等级数字！</p>
              </section>
            </div>
            <button type="button" onClick={closeRules}>
              开始游戏
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

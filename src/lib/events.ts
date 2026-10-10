/**
 * 対応種目の定義（WCA 種目 ID と cubing.js のパズル ID の対応）
 */

export type EventId =
  | '333'
  | '222'
  | '444'
  | '555'
  | '666'
  | '777'
  | '333oh'
  | '333bf'
  | 'pyram'
  | 'skewb'
  | 'minx'
  | 'sq1'
  | 'clock';

export interface EventDef {
  id: EventId;
  /** 画面表示名 */
  name: string;
  /** cubing.js の twisty-player に渡すパズル ID */
  puzzle: string;
  /** WCA 規則上インスペクションがあるか（目隠しは無い） */
  inspection: boolean;
  /** CPU 対戦で 3x3 基準タイムに掛ける係数（世界の平均的な比率から概算） */
  battleScale: number;
}

export const EVENTS: readonly EventDef[] = [
  { id: '333', name: '3x3x3', puzzle: '3x3x3', inspection: true, battleScale: 1 },
  { id: '222', name: '2x2x2', puzzle: '2x2x2', inspection: true, battleScale: 0.3 },
  { id: '444', name: '4x4x4', puzzle: '4x4x4', inspection: true, battleScale: 2.3 },
  { id: '555', name: '5x5x5', puzzle: '5x5x5', inspection: true, battleScale: 4.2 },
  { id: '666', name: '6x6x6', puzzle: '6x6x6', inspection: true, battleScale: 7.8 },
  { id: '777', name: '7x7x7', puzzle: '7x7x7', inspection: true, battleScale: 11.5 },
  { id: '333oh', name: '3x3x3 片手', puzzle: '3x3x3', inspection: true, battleScale: 1.6 },
  { id: '333bf', name: '3x3x3 目隠し', puzzle: '3x3x3', inspection: false, battleScale: 5 },
  { id: 'pyram', name: 'ピラミンクス', puzzle: 'pyraminx', inspection: true, battleScale: 0.4 },
  { id: 'skewb', name: 'スキューブ', puzzle: 'skewb', inspection: true, battleScale: 0.4 },
  { id: 'minx', name: 'メガミンクス', puzzle: 'megaminx', inspection: true, battleScale: 5 },
  { id: 'sq1', name: 'スクエア1', puzzle: 'square1', inspection: true, battleScale: 1.1 },
  { id: 'clock', name: 'クロック', puzzle: 'clock', inspection: true, battleScale: 0.6 },
];

/** 英語表示名（i18n 用） */
export const EVENT_NAMES_EN: Record<EventId, string> = {
  '333': '3x3x3',
  '222': '2x2x2',
  '444': '4x4x4',
  '555': '5x5x5',
  '666': '6x6x6',
  '777': '7x7x7',
  '333oh': '3x3x3 One-Handed',
  '333bf': '3x3x3 Blindfolded',
  pyram: 'Pyraminx',
  skewb: 'Skewb',
  minx: 'Megaminx',
  sq1: 'Square-1',
  clock: 'Clock',
};

export function getEvent(id: string): EventDef {
  return EVENTS.find((e) => e.id === id) ?? EVENTS[0]!;
}

export function isEventId(id: unknown): id is EventId {
  return typeof id === 'string' && EVENTS.some((e) => e.id === id);
}

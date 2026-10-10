/**
 * 回転記号の解析と、初心者向けの言葉による説明
 *
 * NxN キューブは WCA 規則 12 条の記法（R, U', F2, Rw, 3Rw2 など）に対応し、
 * 「どの面を・どちら向きに・どれだけ」回すかに加えて、
 * 「手前から見てどのシールが動くか」という具体的な手の動きも示す。
 * 向きは WCA の持ち方（白が上・緑が手前）を前提とする。
 */

import type { EventId } from './events';
import type { Lang } from './settings';

export type Face = 'U' | 'D' | 'F' | 'B' | 'R' | 'L';

/** WCA 標準配色（白上・緑前）での各面の色 */
export const FACE_COLORS: Record<Face, string> = {
  U: '#ffffff',
  D: '#ffd500',
  F: '#00b84a',
  B: '#0a5cff',
  R: '#e8112d',
  L: '#ff8a00',
};

export interface CubeMove {
  face: Face;
  /** 外側から何層まとめて回すか（通常は 1） */
  layers: number;
  /** 90° 単位の回転量。1 = 時計回り、-1 = 反時計回り、2 = 180° */
  amount: 1 | -1 | 2;
}

/** NxN の 1 手を解析する。対応しない表記なら null */
export function parseCubeMove(token: string): CubeMove | null {
  const m = /^(\d*)([RLUDFB])(w?)(2?)('?)$/.exec(token.trim());
  if (!m) return null;
  const [, prefix, face, wide, two, prime] = m;
  let layers = 1;
  if (wide) layers = prefix ? Number(prefix) : 2;
  else if (prefix) return null; // "2R" のような内側単層の回転は WCA スクランブルに出ないため扱わない
  if (layers < 1 || layers > 7) return null;
  const amount: CubeMove['amount'] = two ? 2 : prime ? -1 : 1;
  return { face: face as Face, layers, amount };
}

export interface MoveDescription {
  /** 回す面（NxN のみ）。アイコンの色と向きに使う */
  move: CubeMove | null;
  /** 何をするか（例: 右面（赤）を時計回りに 90°） */
  title: string;
  /** 手の動きのヒント（例: 手前の面の右の列が上へ動く） */
  hint: string;
}

const FACE_NAMES: Record<Lang, Record<Face, string>> = {
  ja: { U: '上の面', D: '下の面', F: '手前の面', B: '奥の面', R: '右の面', L: '左の面' },
  en: { U: 'Top face', D: 'Bottom face', F: 'Front face', B: 'Back face', R: 'Right face', L: 'Left face' },
};

const COLOR_NAMES: Record<Lang, Record<Face, string>> = {
  ja: { U: '白', D: '黄', F: '緑', B: '青', R: '赤', L: 'オレンジ' },
  en: { U: 'white', D: 'yellow', F: 'green', B: 'blue', R: 'red', L: 'orange' },
};

/**
 * 時計回り（amount = 1）のときに「手前から見て」何が動くか。
 * 反時計回りは向きを逆にし、180° は同じ向きに 2 回。
 */
const MOTION: Record<Lang, Record<Face, [string, string]>> = {
  ja: {
    R: ['手前の面の右の列が上へ動く', '手前の面の右の列が下へ動く'],
    L: ['手前の面の左の列が下へ動く', '手前の面の左の列が上へ動く'],
    U: ['手前の面の上の段が左へ動く', '手前の面の上の段が右へ動く'],
    D: ['手前の面の下の段が右へ動く', '手前の面の下の段が左へ動く'],
    F: ['上の面の手前の列が右へ動く', '上の面の手前の列が左へ動く'],
    B: ['上の面の奥の列が左へ動く', '上の面の奥の列が右へ動く'],
  },
  en: {
    R: ['the right column of the front face moves up', 'the right column of the front face moves down'],
    L: ['the left column of the front face moves down', 'the left column of the front face moves up'],
    U: ['the top row of the front face moves left', 'the top row of the front face moves right'],
    D: ['the bottom row of the front face moves right', 'the bottom row of the front face moves left'],
    F: ['the front row of the top face moves right', 'the front row of the top face moves left'],
    B: ['the back row of the top face moves left', 'the back row of the top face moves right'],
  },
};

function describeCube(move: CubeMove, lang: Lang): MoveDescription {
  const face = FACE_NAMES[lang][move.face];
  const color = COLOR_NAMES[lang][move.face];
  const [cw, ccw] = MOTION[lang][move.face];
  if (lang === 'ja') {
    const target = move.layers === 1 ? `${face}（${color}）を` : `${face}（${color}）から ${move.layers} 層まとめて、`;
    const dir = move.amount === 2 ? '180°（半回転）' : move.amount === 1 ? '時計回りに 90°' : '反時計回りに 90°';
    const motion = move.amount === -1 ? ccw : cw;
    const viewFrom = move.face === 'F' ? '' : '（その面を正面から見たときの向き）';
    return {
      move,
      title: `${target}${dir}`,
      hint: move.amount === 2 ? `${motion}（向きはどちらでも同じ）` : `${motion}${viewFrom}`,
    };
  }
  const layers = move.layers === 1 ? '' : ` with ${move.layers} layers`;
  const dir = move.amount === 2 ? '180° (half turn)' : move.amount === 1 ? '90° clockwise' : '90° counter-clockwise';
  const motion = move.amount === -1 ? ccw : cw;
  return {
    move,
    title: `${face} (${color})${layers}, ${dir}`,
    hint: move.amount === 2 ? `${motion} (either direction is fine)` : `${capitalize(motion)} (as seen looking at that face)`,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** ピラミンクス・スキューブなど NxN 以外の 1 手の説明 */
function describeOther(event: EventId, token: string, lang: Lang): MoveDescription {
  const ja = lang === 'ja';
  const t = token.trim();
  const ccw = t.endsWith("'");
  const dirJa = ccw ? '反時計回り' : '時計回り';
  const dirEn = ccw ? 'counter-clockwise' : 'clockwise';
  switch (event) {
    case 'pyram': {
      const tip = /^[ulrb]/.test(t);
      const corner = { U: '上', L: '左', R: '右', B: '奥' }[t.charAt(0).toUpperCase() as 'U'] ?? '';
      const cornerEn = { U: 'top', L: 'left', R: 'right', B: 'back' }[t.charAt(0).toUpperCase() as 'U'] ?? '';
      return ja
        ? { move: null, title: `${corner}の頂点${tip ? 'の先端だけ' : 'を含む 2 段'}を${dirJa}に 1/3 回転`, hint: '黄色の面を下、緑を手前にして、その頂点の方から見た向き' }
        : { move: null, title: `Turn the ${cornerEn} corner ${tip ? 'tip only' : '(two layers)'} 1/3 ${dirEn}`, hint: 'Yellow on the bottom, green in front; direction as seen from that corner' };
    }
    case 'skewb': {
      // WCA 規則 12h: 3 つの面が見える持ち方で、各記号は特定の頂点まわりの層を表す
      const corner = { U: '上の奥の角', R: '右下の奥の角', L: '左下の奥の角', B: '裏側の見えない角' }[t.charAt(0) as 'U'] ?? '';
      const cornerEn = { U: 'far upper', R: 'far bottom-right', L: 'far bottom-left', B: 'hidden back' }[t.charAt(0) as 'U'] ?? '';
      return ja
        ? { move: null, title: `${corner}のまわりの半分を${dirJa}に 1/3 回転`, hint: '白を上・緑を左手前にして 3 つの面が見えるように持ち、その角の方から見た向き' }
        : { move: null, title: `Turn the layer around the ${cornerEn} corner 1/3 ${dirEn}`, hint: 'White on top, green front-left, three faces visible; direction as seen from that corner' };
    }
    case 'minx': {
      if (t.startsWith('U')) {
        return ja
          ? { move: null, title: `上の面を${dirJa}に 1/5 回転`, hint: '各行の最後に上の面だけを回す' }
          : { move: null, title: `Turn the top face 1/5 ${dirEn}`, hint: 'The top face turn at the end of each line' };
      }
      const plus = t.endsWith('++');
      // WCA 規則 12d2: 左上の 3 ピースを含む層を固定し、残り全体を 144° 回す
      if (t.startsWith('R')) {
        return ja
          ? { move: null, title: `左側の層以外をまとめて 2/5 回転（手前が${plus ? '上' : '下'}へ）`, hint: '左上の 3 ピースを含む縦の層を押さえたまま、残り全体を回す' }
          : { move: null, title: `Turn everything except the left slice 2/5 (front moves ${plus ? 'up' : 'down'})`, hint: 'Hold the vertical slice with the top-left three pieces; turn the rest' };
      }
      return ja
        ? { move: null, title: `上側の層以外をまとめて 2/5 回転（手前が${plus ? '右' : '左'}へ）`, hint: '左上の 3 ピースを含む横の層を押さえたまま、残り全体を回す' }
        : { move: null, title: `Turn everything except the top slice 2/5 (front moves ${plus ? 'right' : 'left'})`, hint: 'Hold the horizontal slice with the top-left three pieces; turn the rest' };
    }
    case 'sq1': {
      if (t === '/') {
        return ja
          ? { move: null, title: '右半分を 180° 回す（スラッシュ）', hint: '手前から見て右半分をひっくり返す' }
          : { move: null, title: 'Turn the right half 180° (slash)', hint: 'Flip the right half as seen from the front' };
      }
      const m = /\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/.exec(t);
      const top = m ? Number(m[1]) : 0;
      const bottom = m ? Number(m[2]) : 0;
      const part = (n: number, jaName: string, enName: string) =>
        n === 0 ? '' : ja ? `${jaName}を${n > 0 ? '時計回り' : '反時計回り'}に ${Math.abs(n) * 30}°` : `${enName} ${Math.abs(n) * 30}° ${n > 0 ? 'clockwise' : 'counter-clockwise'}`;
      const parts = [part(top, '上の段', 'top layer'), part(bottom, '下の段', 'bottom layer')].filter(Boolean);
      return ja
        ? { move: null, title: parts.join('、') || '回さない', hint: '数字 1 つ分 = 30°。上の段は上から、下の段は下から見た向き' }
        : { move: null, title: parts.join(', ') || 'No turn', hint: 'One unit = 30°. Top seen from above, bottom seen from below' };
    }
    case 'clock': {
      if (t.startsWith('y2')) {
        return ja ? { move: null, title: 'クロックを左右にひっくり返す', hint: '裏側の面を手前に向ける' } : { move: null, title: 'Flip the clock over (left to right)', hint: 'Bring the back face to the front' };
      }
      const m = /^([A-Z]+)(\d)([+-])$/.exec(t);
      const pins = m?.[1] ?? '';
      const hours = m?.[2] ?? '0';
      const plus = m?.[3] === '+';
      const pinJa: Record<string, string> = { UR: '右上', DR: '右下', DL: '左下', UL: '左上', U: '上の 2 つ', R: '右の 2 つ', D: '下の 2 つ', L: '左の 2 つ', ALL: 'すべて' };
      return ja
        ? { move: null, title: `ピン「${pinJa[pins] ?? pins}」を上げて、${hours} 時間ぶん${plus ? '時計回り' : '反時計回り'}に回す`, hint: '上げたピンに対応するダイヤルを回す' }
        : { move: null, title: `Pins "${pins}" up, turn ${hours} hour(s) ${plus ? 'clockwise' : 'counter-clockwise'}`, hint: 'Turn a dial next to a raised pin' };
    }
    default:
      return { move: null, title: t, hint: '' };
  }
}

/** 1 手の説明を返す */
export function describeMove(event: EventId, token: string, lang: Lang): MoveDescription {
  const cube = parseCubeMove(token);
  if (cube && /^\d{3}/.test(event)) return describeCube(cube, lang);
  return describeOther(event, token, lang);
}

/** スクランブルを 1 手ずつに分ける（スクエア1 の "(1, 0)" やメガミンクスの改行に対応） */
export function splitScramble(scramble: string): string[] {
  const tokens: string[] = [];
  // "/" は空白で区切られていなくても独立した 1 手（手入力の "(1,0)/(-3,3)/" など）
  const re = /\(\s*-?\d+\s*,\s*-?\d+\s*\)|\/|[^\s/]+/g;
  for (const m of scramble.matchAll(re)) tokens.push(m[0]);
  return tokens;
}

/** スクランブルを始める前の持ち方（WCA 規則 4d） */
export function holdInstruction(event: EventId, lang: Lang): string {
  const ja = lang === 'ja';
  switch (event) {
    case 'pyram':
      return ja ? '黄色の面を下、緑の面を手前にして持つ' : 'Yellow face on the bottom, green face in front';
    case 'skewb':
      return ja ? '白を上、緑を左手前にして、3 つの面が見えるように持つ' : 'White on top, green front-left, three faces visible';
    case 'sq1':
      return ja ? '2 通りの持ち方のうち、暗い色の面を手前にして持つ' : 'Of the two possible orientations, the darker colour in front';
    case 'clock':
      return ja ? 'どちらの面を手前にしてもよい。12 時を上にして持つ' : 'Either side in front, 12 o\'clock pointing up';
    default:
      return ja ? '白の面を上、緑の面を手前にして持つ' : 'White face on top, green face in front';
  }
}

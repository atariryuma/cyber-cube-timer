import { describe, expect, it } from 'vitest';
import { describeMove, holdInstruction, parseCubeMove, splitScramble } from '../src/lib/notation';

describe('parseCubeMove', () => {
  it('基本の 18 手', () => {
    expect(parseCubeMove('R')).toEqual({ face: 'R', layers: 1, amount: 1 });
    expect(parseCubeMove("U'")).toEqual({ face: 'U', layers: 1, amount: -1 });
    expect(parseCubeMove('F2')).toEqual({ face: 'F', layers: 1, amount: 2 });
  });

  it('外側から複数層（WCA 規則 12a2: Rw = 2Rw）', () => {
    expect(parseCubeMove('Rw')).toEqual({ face: 'R', layers: 2, amount: 1 });
    expect(parseCubeMove("3Fw'")).toEqual({ face: 'F', layers: 3, amount: -1 });
    expect(parseCubeMove('Dw2')).toEqual({ face: 'D', layers: 2, amount: 2 });
  });

  it('対象外の表記', () => {
    expect(parseCubeMove('R++')).toBeNull();
    expect(parseCubeMove('/')).toBeNull();
    expect(parseCubeMove('2R')).toBeNull();
    expect(parseCubeMove('UR4+')).toBeNull();
  });
});

describe('describeMove（3x3x3）', () => {
  it('面・色・向き・手の動き', () => {
    const r = describeMove('333', 'R', 'ja');
    expect(r.title).toBe('右の面（赤）を時計回りに 90°');
    expect(r.hint).toContain('右の列が上へ');
    expect(describeMove('333', "R'", 'ja').hint).toContain('右の列が下へ');
    expect(describeMove('333', 'L', 'ja').hint).toContain('左の列が下へ');
    expect(describeMove('333', 'U', 'ja').hint).toContain('上の段が左へ');
    expect(describeMove('333', 'D', 'ja').hint).toContain('下の段が右へ');
    expect(describeMove('333', 'F', 'ja').hint).toContain('手前の列が右へ');
    expect(describeMove('333', 'B', 'ja').hint).toContain('奥の列が左へ');
  });

  it('180° と複数層', () => {
    expect(describeMove('333', 'U2', 'ja').title).toContain('180°');
    expect(describeMove('444', 'Rw', 'ja').title).toBe('右の面（赤）から 2 層まとめて、時計回りに 90°');
    expect(describeMove('666', "3Bw'", 'en').title).toBe('Back face (blue) with 3 layers, 90° counter-clockwise');
  });
});

describe('describeMove（他のパズル）', () => {
  it('スクエア1', () => {
    expect(describeMove('sq1', '(1, -2)', 'ja').title).toBe('上の段を時計回りに 30°、下の段を反時計回りに 60°');
    expect(describeMove('sq1', '/', 'ja').title).toContain('右半分を 180°');
  });

  it('ピラミンクス・スキューブ・メガミンクス・クロック', () => {
    expect(describeMove('pyram', 'u', 'ja').title).toContain('先端だけ');
    expect(describeMove('pyram', "L'", 'ja').title).toContain('反時計回り');
    expect(describeMove('skewb', 'B', 'ja').title).toContain('裏側の見えない角');
    expect(describeMove('minx', 'R++', 'ja').title).toContain('手前が上へ');
    expect(describeMove('minx', "U'", 'ja').title).toContain('反時計回り');
    expect(describeMove('clock', 'UR4+', 'ja').title).toContain('右上');
    expect(describeMove('clock', 'y2', 'ja').title).toContain('ひっくり返す');
  });
});

describe('splitScramble', () => {
  it('スクエア1 の (x, y) を 1 手として扱う', () => {
    expect(splitScramble('(1, 0) / (-3, 3) /')).toEqual(['(1, 0)', '/', '(-3, 3)', '/']);
  });

  it('空白なしで書かれたスクエア1 も 1 手ずつに分ける', () => {
    expect(splitScramble('(1,0)/(-3,3)/')).toEqual(['(1,0)', '/', '(-3,3)', '/']);
  });

  it('メガミンクスの改行を無視する', () => {
    expect(splitScramble("R++ D-- U\nR-- D++ U'")).toEqual(['R++', 'D--', 'U', 'R--', 'D++', "U'"]);
  });
});

describe('holdInstruction', () => {
  it('WCA 規則 4d の持ち方', () => {
    expect(holdInstruction('333', 'ja')).toContain('白の面を上');
    expect(holdInstruction('pyram', 'ja')).toContain('黄色の面を下');
    expect(holdInstruction('skewb', 'ja')).toContain('緑を左手前');
    expect(holdInstruction('clock', 'ja')).toContain('12 時');
  });
});

// 소개 페이지용 벡터 아이콘 띠 만들기.
// 앱 안의 아이콘(Resources/Marks/*.png)은 한 장면이 36px이라 웹에서 크게 키우면 뭉개진다.
// 같은 움직임 스크립트(icons/<id>.js)로 장면마다 벡터 SVG를 그려 가로로 이어 붙인다 → 어떤 크기로 키워도 선명하다.
//
//   node tools/motion/web-sprites.mjs        → docs/assets/marks-svg/<id>.svg
//
// 그리는 규칙은 lib.js 머리말과 같다: 모양 = (ink 합) − (cut 합) + (front 합), 그 위에 fade 50 %.
// 색은 검정 하나라서 페이지에서는 CSS mask 로 원하는 색을 입힌다.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = new URL('../..', import.meta.url).pathname;
const IDS = ['buddha', 'wave', 'surf', 'fishing', 'tree', 'magnolia', 'lotus', 'pagoda', 'incense', 'crane', 'cat', 'leaf', 'furin', 'peek'];
const OUT = ROOT + 'docs/assets/marks-svg/';
mkdirSync(OUT, { recursive: true });
const lib = readFileSync(ROOT + 'tools/motion/lib.js', 'utf8');

// 좌표를 소수 둘째 자리로 줄여 파일 크기를 줄인다 (18pt 칸에서 0.01pt는 보이지 않는다)
const slim = (s) => s.replace(/-?\d+\.\d{3,}/g, (n) => String(Math.round(parseFloat(n) * 100) / 100));

for (const id of IDS) {
  const ctx = vm.createContext({ Math, console });
  vm.runInContext(lib + '\n' + readFileSync(ROOT + `tools/motion/icons/${id}.js`, 'utf8') + '\n;globalThis.__icon = ICON;', ctx);
  const icon = ctx.__icon;
  const n = icon.frames;
  let defs = '', body = '';
  for (let i = 0; i < n; i++) {
    const els = slim(String(icon.at(i / n))).match(/<(path|circle|ellipse|rect|polygon|polyline|line)\b[^>]*\/>/g) || [];
    const ink = [], cut = [], front = [], fade = [];
    for (const e of els) {
      if (/#f00/i.test(e)) cut.push(e.replace(/#f00/gi, '#000'));
      else if (/#00f/i.test(e)) front.push(e.replace(/#00f/gi, '#000'));
      else if (/(fill|stroke)-opacity="0\.5"/.test(e)) fade.push(e);
      else ink.push(e);
    }
    if (cut.length) defs += `<mask id="c${i}" maskUnits="userSpaceOnUse" x="-2" y="-2" width="22" height="22"><rect x="-2" y="-2" width="22" height="22" fill="#fff"/>${cut.join('')}</mask>`;
    body += `<svg x="${i * 18}" width="18" height="18" viewBox="0 0 18 18"><g${cut.length ? ` mask="url(#c${i})"` : ''}>${ink.join('')}</g>${front.join('')}${fade.join('')}</svg>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${n * 18}" height="18" viewBox="0 0 ${n * 18} 18"><defs>${defs}</defs>${body}</svg>`;
  writeFileSync(OUT + id + '.svg', svg);
  console.log(id, n, 'frames', Math.round(svg.length / 1024) + 'KB');
}

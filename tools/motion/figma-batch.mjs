// Figma 가져오기 코드 묶음 만들기.
// 완성된 움직임 스크립트(tools/motion/icons/<id>.js)를 Figma의 use_figma 로 보낼 코드로 묶는다.
// 한 번에 보낼 수 있는 코드는 50,000자라 몇 개씩 나눈다. 받는 쪽은 코드를 그대로 붙여 보내기만 하면 된다.
// 옮겨 적다 틀리는 일을 막으려고, 스크립트 본문의 해시를 Figma 안에서 다시 계산해 맞는지 확인한다.
//
//   node tools/motion/figma-batch.mjs                      → tools/motion/figma/batch-N.js 와 manifest.json
//   node tools/motion/figma-batch.mjs --only=cat,leaf      → 고친 아이콘만 다시 보낼 때
//   node tools/motion/figma-batch.mjs --max-icons=1        → Figma 쪽 시간이 모자라면 한 묶음에 넣는 아이콘 수를 줄인다
//
// 각 batch 파일 맨 위 주석에 해시가 있고, Figma가 돌려주는 결과의 hash.got 이 hash.expected 와 같아야 한다.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const ROOT = new URL('../..', import.meta.url).pathname;
const opt = (name) => { const a = process.argv.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : null; };
const ALL = ['buddha', 'wave', 'surf', 'fishing', 'tree', 'magnolia', 'lotus', 'pagoda', 'incense', 'dipper', 'cat', 'leaf', 'peek'];
const ONLY = opt('only') ? opt('only').split(',').map((s) => s.trim()).filter(Boolean) : null;
if (ONLY) for (const id of ONLY) if (!ALL.includes(id)) throw new Error(`unknown icon id: ${id}`);
const ORDER = ONLY ? ALL.filter((id) => ONLY.includes(id)) : ALL;
const MAX_ICONS = Number(opt('max-icons')) || Infinity;
const LIMIT = 46000;

// 줄 전체가 주석인 줄과 빈 줄만 지운다 (문자열 안의 // 은 건드리지 않는다)
const strip = (s) => s.split('\n').filter((l) => !/^\s*\/\//.test(l) && l.trim() !== '').map((l) => l.replace(/\s+$/, '')).join('\n');
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };

const lib = strip(readFileSync(ROOT + 'tools/motion/lib.js', 'utf8'));
const icons = ORDER.map((id) => ({ id, src: strip(readFileSync(ROOT + `tools/motion/icons/${id}.js`, 'utf8')) }));

const BUILD = String.raw`
const __BLACK = { r: 0, g: 0, b: 0 };
function __buildFrame(name, inner) {
  const tmp = figma.createNodeFromSvg('<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>');
  const fr = figma.createFrame();
  fr.name = name; fr.resize(18, 18); fr.fills = []; fr.clipsContent = true;
  const ink = [], cut = [], top = [], fade = [];
  for (const child of [...tmp.children]) {
    const hasStroke = Array.isArray(child.strokes) && child.strokes.length > 0;
    const hasFill = Array.isArray(child.fills) && child.fills.length > 0;
    if (!hasStroke && !hasFill) { child.remove(); continue; }
    const p = hasStroke ? child.strokes[0] : child.fills[0];
    const kind = p.color.r > 0.5 ? 'cut' : p.color.b > 0.5 ? 'top' : 'ink';
    const op = p.opacity !== undefined ? p.opacity : 1;
    const nodes = [];
    fr.appendChild(child);
    if (hasStroke) {
      const o = child.outlineStroke();
      if (o) { fr.appendChild(o); nodes.push(o); }
      if (hasFill) { child.strokes = []; nodes.push(child); } else child.remove();
    } else nodes.push(child);
    for (const n of nodes) {
      if (kind === 'cut') cut.push(n); else if (kind === 'top') top.push(n);
      else if (op < 0.99) fade.push({ node: n, op }); else ink.push(n);
    }
  }
  tmp.remove();
  let base = ink.length ? figma.union(ink, fr) : null;
  if (base && cut.length) base = figma.subtract([base, figma.union(cut, fr)], fr);
  else if (cut.length) for (const c of cut) c.remove();
  if (top.length) base = base ? figma.union([base, figma.union(top, fr)], fr) : figma.union(top, fr);
  if (base) {
    const main = figma.flatten([base], fr);
    main.name = 'ink'; main.fills = [{ type: 'SOLID', color: __BLACK }]; main.strokes = [];
  }
  if (fade.length) {
    const v = figma.flatten([figma.union(fade.map((x) => x.node), fr)], fr);
    v.name = 'ink-' + Math.round(fade[0].op * 100); v.fills = [{ type: 'SOLID', color: __BLACK, opacity: fade[0].op }]; v.strokes = [];
  }
  return fr;
}
const __page = figma.root.children.find((p) => p.name === 'Motion');
await figma.setCurrentPageAsync(__page);
const __wrap = __page.children.find((n) => n.name === 'frames');
const __OLD = { pagoda: 'cairn', dipper: 'moon', magnolia: 'lily' };
const __ORDER = ${JSON.stringify(ALL)};
const __out = {}, __errors = [];
const __icons = __run();
for (const id of Object.keys(__icons)) {
  const icon = __icons[id];
  let row = __wrap.children.find((n) => n.name === id || n.name === __OLD[id]);
  if (!row) { row = figma.createAutoLayout('HORIZONTAL', { name: id, itemSpacing: 0 }); row.fills = []; __wrap.appendChild(row); }
  row.name = id;
  for (const c of [...row.children]) c.remove();
  for (let i = 0; i < icon.frames; i++) {
    try { row.appendChild(__buildFrame(id + '/' + String(i).padStart(2, '0'), icon.at(i / icon.frames))); }
    catch (e) { __errors.push(id + '/' + i + ': ' + String(e).slice(0, 80)); }
  }
  __out[id] = row.children.length;
}
const __rows = [...__wrap.children].sort((a, b) => __ORDER.indexOf(a.name) - __ORDER.indexOf(b.name));
__rows.forEach((r, i) => __wrap.insertChild(i, r));
return { batch: __BATCH, hash: { expected: __EXPECTED, got: __got }, frames: __out, errors: __errors.slice(0, 10), errorCount: __errors.length, wrap: { id: __wrap.id, w: __wrap.width, h: __wrap.height } };
`;

function program(n, group) {
  const run = 'function () {\n' + lib + '\nvar __I = {};\n' +
    group.map((g) => `__I[${JSON.stringify(g.id)}] = (function () {\n${g.src}\nreturn ICON;\n})();`).join('\n') +
    '\nreturn __I;\n}';
  // Figma 쪽 실행기는 큰 코드를 다시 포맷하므로 코드 글자가 아니라 "그려지는 결과"를 확인한다:
  // 모든 아이콘·모든 장면의 SVG 문자열을 이어 붙인 해시.
  const icons = vm.runInNewContext('(' + run + ')()', {});
  let all = '';
  for (const id of Object.keys(icons)) for (let i = 0; i < icons[id].frames; i++) all += icons[id].at(i / icons[id].frames) + '\n';
  const expected = fnv(all);
  const head = `// Layerhover menu bar icons — Figma import batch ${n}: ${group.map((g) => g.id).join(', ')} — hash ${expected}\n`;
  const code = head +
    'const __run = ' + run + ';\n' +
    `const __BATCH = ${n};\nconst __EXPECTED = ${JSON.stringify(expected)};\n` +
    'const __hash = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); };\n' +
    'const __probe = __run(); let __all = "";\n' +
    'for (const id of Object.keys(__probe)) for (let i = 0; i < __probe[id].frames; i++) __all += __probe[id].at(i / __probe[id].frames) + "\\n";\n' +
    'const __got = __hash(__all);\n' +
    'if (__got !== __EXPECTED) return { batch: __BATCH, error: "the drawing differs from the source: output hash mismatch", hash: { expected: __EXPECTED, got: __got } };\n' +
    BUILD;
  return { code, expected };
}

// 크기에 맞춰 나눈다
const batches = [];
let cur = [];
for (const ic of icons) {
  const trial = program(batches.length + 1, cur.concat([ic])).code;
  if (cur.length && (trial.length > LIMIT || cur.length >= MAX_ICONS)) { batches.push(cur); cur = [ic]; } else cur.push(ic);
}
if (cur.length) batches.push(cur);

rmSync(ROOT + 'tools/motion/figma', { recursive: true, force: true });   // batch 파일만 담는 폴더 (마무리 코드는 figma-finalize/)
mkdirSync(ROOT + 'tools/motion/figma', { recursive: true });
const manifest = [];
batches.forEach((g, k) => {
  const { code, expected } = program(k + 1, g);
  if (code.length > 50000) throw new Error(`batch ${k + 1} is ${code.length} chars (over 50,000): ${g.map((x) => x.id).join(', ')} — shorten an icon file`);
  const file = `tools/motion/figma/batch-${k + 1}.js`;
  writeFileSync(ROOT + file, code);
  manifest.push({ batch: k + 1, file, ids: g.map((x) => x.id), chars: code.length, hash: expected,
    sha1: createHash('sha1').update(code).digest('hex') });
});
writeFileSync(ROOT + 'tools/motion/figma/manifest.json', JSON.stringify(manifest, null, 2));
for (const m of manifest) console.log(`batch ${m.batch}: ${m.ids.join(', ')} — ${m.chars} chars — hash ${m.hash}`);

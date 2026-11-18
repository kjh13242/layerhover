// Figma 묶음 검증: tools/motion/figma/batch-N.js 안의 코드(주석 지운 것)가 원본 스크립트와 모든 장면에서 똑같은 SVG를 만드는지 확인한다.
// 프로젝트 폴더에서:  node tools/motion/figma-batch.mjs && node tools/motion/figma-verify.cjs
const fs = require('fs'), vm = require('vm');
const dir = 'tools/motion/figma';
const lib = fs.readFileSync('tools/motion/lib.js', 'utf8');
let total = 0, bad = 0;
for (const f of fs.readdirSync(dir).filter(f => f.startsWith('batch-'))) {
  const code = fs.readFileSync(dir + '/' + f, 'utf8');
  const start = code.indexOf('const __run = ');
  const end = code.indexOf('\nconst __BATCH');
  const runSrc = code.slice(start + 'const __run = '.length, end).replace(/;\s*$/, '');
  const run = vm.runInNewContext('(' + runSrc + ')', {});
  const icons = run();
  for (const id of Object.keys(icons)) {
    const ref = vm.runInNewContext(lib + '\n' + fs.readFileSync(`tools/motion/icons/${id}.js`, 'utf8') + '\nICON', {});
    for (let i = 0; i < icons[id].frames; i++) {
      total++;
      const a = icons[id].at(i / icons[id].frames), b = ref.at(i / ref.frames);
      if (a !== b) { bad++; if (bad < 5) console.log('DIFF', id, i); }
    }
  }
}
console.log(`frames compared: ${total}, different: ${bad}`);
if (bad) process.exit(1);

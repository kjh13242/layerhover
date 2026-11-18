// Figma 마무리 1: Icons 페이지의 정지 그림(장면 00) 컴포넌트를 Motion 페이지의 새 장면 00으로 바꾸고, 검토판 이름표를 맞춘다.
const ORDER = ["buddha", "wave", "surf", "fishing", "tree", "magnolia", "lotus", "pagoda", "incense", "dipper", "cat", "leaf", "peek"];
const OLD = { pagoda: "cairn", dipper: "moon", magnolia: "lily" };
const NAMES = { buddha: "반가사유상", wave: "파도", surf: "서핑", fishing: "낚시", tree: "크리스마스 나무", magnolia: "목련", lotus: "연꽃", pagoda: "석탑", incense: "향", dipper: "북두칠성", cat: "고양이와 나비", leaf: "나뭇잎", peek: "옆에서 나오는 패널" };
const page = figma.root.children.find((p) => p.name === "Icons");
await figma.setCurrentPageAsync(page);
const src = page.children.find((n) => n.name.startsWith("원본"));
const wrap = await figma.getNodeByIdAsync("12:2658");
const done = [], problems = [];
for (const id of ORDER) {
  const comp = src.children.find((c) => c.name === id + "/00" || c.name === (OLD[id] || "") + "/00");
  const row = wrap.children.find((r) => r.name === id);
  if (!comp || !row || !row.children.length) { problems.push(id); continue; }
  for (const c of [...comp.children]) c.remove();
  for (const ch of row.children[0].children) comp.appendChild(ch.clone());
  comp.name = id + "/00";
  done.push(id);
}
const order = (n) => ORDER.indexOf(n.name.replace("/00", ""));
[...src.children].sort((a, b) => order(a) - order(b)).forEach((k, i) => src.insertChild(i, k));
const board = page.children.find((n) => n.name.startsWith("G2"));
let labels = 0, darkFixed = 0;
if (board) {
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  for (const col of board.children) {
    const id = Object.keys(OLD).find((k) => OLD[k] === col.name) || col.name;
    col.name = id;
    const t = col.findOne((n) => n.type === "TEXT" && n.fontSize === 18);
    if (t && NAMES[id]) { await figma.loadFontAsync(t.fontName); t.characters = NAMES[id]; labels++; }
    for (const bar of col.findAll((n) => n.name === "어두운 막대")) for (const inst of bar.findAllWithCriteria({ types: ["INSTANCE"] })) for (const v of inst.children) {
      const f = Array.isArray(v.fills) ? v.fills[0] : null;
      if (f && f.color.r < 0.5) { v.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: f.opacity === undefined ? 1 : f.opacity }]; darkFixed++; }
    }
  }
  [...board.children].sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name)).forEach((k, i) => board.insertChild(i, k));
  board.name = "G2 검토판 (정지 장면 13개)";
}
return { done, problems, labels, darkFixed, srcId: src.id, boardId: board ? board.id : null };

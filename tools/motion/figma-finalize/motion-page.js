// Figma 마무리 2: Motion 페이지의 주요 장면 검토판을 새 장면으로 다시 만들고, 스크립트 안내 글을 바꾼다.
const ORDER = ["buddha", "wave", "surf", "fishing", "tree", "magnolia", "lotus", "pagoda", "incense", "dipper", "cat", "leaf", "peek"];
const NAMES = { buddha: "반가사유상", wave: "파도", surf: "서핑", fishing: "낚시", tree: "크리스마스 나무", magnolia: "목련", lotus: "연꽃", pagoda: "석탑", incense: "향", dipper: "북두칠성", cat: "고양이와 나비", leaf: "나뭇잎", peek: "옆에서 나오는 패널" };
const page = figma.root.children.find((p) => p.name === "Motion");
await figma.setCurrentPageAsync(page);
const wrap = page.children.find((n) => n.name === "frames");
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
const old = page.children.find((n) => n.name === "주요 장면 검토판"); if (old) old.remove();
const board = figma.createAutoLayout("VERTICAL", { name: "주요 장면 검토판", itemSpacing: 20 });
board.paddingLeft = board.paddingRight = board.paddingTop = board.paddingBottom = 40;
board.fills = [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.95 } }];
board.x = wrap.x; board.y = wrap.y + wrap.height + 80;
for (const id of ORDER) {
  const row = wrap.children.find((r) => r.name === id); if (!row) continue;
  const line = figma.createAutoLayout("HORIZONTAL", { name: id, itemSpacing: 12 });
  line.fills = []; line.counterAxisAlignItems = "CENTER";
  const lab = figma.createText(); lab.fontName = { family: "Inter", style: "Semi Bold" }; lab.fontSize = 16;
  lab.characters = NAMES[id] + "\n" + row.children.length + "장면"; lab.resize(150, 44); lab.textAutoResize = "HEIGHT";
  line.appendChild(lab);
  const n = row.children.length;
  for (let k = 0; k < 8; k++) {
    const i = Math.floor(k * n * 9 / 64);
    const card = figma.createFrame(); card.name = String(i).padStart(2, "0"); card.resize(120, 120); card.cornerRadius = 12;
    card.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    const c = row.children[i].clone(); card.appendChild(c); c.rescale(6); c.x = 6; c.y = 6;
    line.appendChild(card);
  }
  board.appendChild(line);
}
const note = page.children.find((n) => n.name === "움직임 규칙 (스크립트)");
if (note && note.type === "TEXT") {
  await figma.loadFontAsync(note.fontName);
  note.characters = "움직임 규칙(스크립트)은 프로젝트 폴더에 있습니다.\n  tools/motion/icons/<아이콘>.js  — 아이콘마다 장면을 그리는 스크립트\n  tools/motion/lib.js           — 공용 그리기 도구\n  tools/motion/STYLE.md         — 디자인 규칙\n이 페이지의 frames 프레임은 그 스크립트를 Figma에서 실행해 만든 장면입니다 (한 줄 = 아이콘 하나, 한 칸 = 18×18 장면 하나, 초당 8장면).";
  note.fontSize = 14;
}
return { boardId: board.id, rows: board.children.length, w: board.width, h: board.height };

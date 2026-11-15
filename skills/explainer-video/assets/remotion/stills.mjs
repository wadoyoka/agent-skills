// 各シーンの「全部出そろったフレーム」を静止画にする。本番の書き出しの前に、配置を目で確かめるため。
//
// 使い方（movie/ で実行）:
//   node stills.mjs                    全シーン → out/stills/<シーンID>.png
//   node stills.mjs flow end           指定したシーンだけ
//   node stills.mjs --every-line       各文の途中（出てくる途中の様子）も → out/stills/<ID>-l<文番号>.png
//
// まとめて見るときは: bash contact-sheet.sh out/sheet out/stills/*.png
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const timing = JSON.parse(readFileSync(join(root, "timing.json"), "utf8"));
const args = process.argv.slice(2);
const everyLine = args.includes("--every-line");
const only = args.filter((a) => !a.startsWith("--"));

const serveUrl = await bundle({ entryPoint: join(root, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "Main" });
mkdirSync(join(root, "out/stills"), { recursive: true });

let start = 0;
for (const s of timing.scenes) {
  if (!only.length || only.includes(s.id)) {
    const last = s.lines[s.lines.length - 1];
    const picks = { [s.id]: start + last.start + last.frames - 2 };
    if (everyLine) s.lines.forEach((l, i) => (picks[`${s.id}-l${i}`] = start + l.start + Math.min(l.frames - 2, 40)));
    for (const [name, frame] of Object.entries(picks)) {
      await renderStill({ serveUrl, composition, frame, output: join(root, `out/stills/${name}.png`), scale: 0.5 });
      console.log(`out/stills/${name}.png（${frame} フレーム目）`);
    }
  }
  start += s.duration;
}

// HTML 版の書き出し。index.html を Playwright で開き、renderFrame(n) → 1 枚撮る、を全フレーム繰り返して
// ffmpeg で動画にし、ナレーションを重ねて音量をそろえる。Remotion は使わない。
//
// 使い方（movie/ で実行）:
//   node render.mjs                     全体を書き出す → out/video.mp4
//   node render.mjs --name intro        出力名を変える → out/intro.mp4
//   node render.mjs --from 0 --to 600   一部だけ（音声なし）→ out/part.mp4
//   node render.mjs --stills            各シーンの「全部出そろったフレーム」→ out/stills/<ID>.png
//   node render.mjs --stills --every-line flow   各文の途中も、指定シーンだけ
//   node render.mjs --preview           ブラウザで確かめる用のサーバーを立てる（Ctrl+C で止める）
//
// ブラウザは、入っている Google Chrome → Microsoft Edge → Playwright の Chromium の順に探す。
// どれも無ければ: npx playwright-core install chromium
import { spawn, spawnSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright-core";

const root = process.cwd();
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const ids = args.filter((a, i) => !a.startsWith("--") && !["--name", "--from", "--to"].includes(args[i - 1]));

// ---- 静的サーバー（movie/ の中だけを配る） ----
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".wav": "audio/wav",
  ".woff2": "font/woff2",
};
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
  const file = join(root, path || "index.html");
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

if (flag("--preview")) {
  console.log(`プレビュー: ${base}/index.html （Ctrl+C で止める）`);
  await new Promise(() => {});
}

// ---- ブラウザ ----
const launch = async () => {
  for (const channel of ["chrome", "msedge", undefined]) {
    try {
      return await chromium.launch(channel ? { channel } : {});
    } catch {
      // 次の候補へ
    }
  }
  throw new Error("ブラウザが見つかりません。npx playwright-core install chromium を実行してください。");
};
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("ページのエラー:", e.message));
await page.goto(`${base}/index.html?render`);
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60_000 });
const error = await page.evaluate(() => window.__error);
if (error) throw new Error(error);
const timing = await page.evaluate(() => window.__timing);
const stage = page.locator("#stage");
const shoot = async (frame, options) => {
  await page.evaluate((f) => window.renderFrame(f), frame);
  return stage.screenshot(options);
};

const finish = async () => {
  await browser.close();
  server.close();
};

// ---- 静止画 ----
if (flag("--stills")) {
  mkdirSync(join(root, "out/stills"), { recursive: true });
  let start = 0;
  for (const s of timing.scenes) {
    if (!ids.length || ids.includes(s.id)) {
      const last = s.lines[s.lines.length - 1];
      const picks = { [s.id]: start + last.start + last.frames - 2 };
      if (flag("--every-line")) s.lines.forEach((l, i) => (picks[`${s.id}-l${i}`] = start + l.start + Math.min(l.frames - 2, 40)));
      for (const [name, frame] of Object.entries(picks)) {
        await shoot(frame, { path: join(root, `out/stills/${name}.png`) });
        console.log(`out/stills/${name}.png（${frame} フレーム目）`);
      }
    }
    start += s.duration;
  }
  await finish();
  process.exit(0);
}

// ---- 動画 ----
const from = Number(opt("--from", 0));
const to = Math.min(Number(opt("--to", timing.total)), timing.total);
const partial = from > 0 || to < timing.total;
const name = opt("--name", partial ? "part" : "video");
mkdirSync(join(root, "out"), { recursive: true });
const silent = join(root, `out/.${name}-noaudio.mp4`);

const ff = spawn(
  "ffmpeg",
  ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(timing.fps), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium", silent],
  { stdio: ["pipe", "inherit", "inherit"] },
);
const ffDone = new Promise((res, rej) => ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg が失敗しました（${code}）`)))));
const write = (buf) => new Promise((res, rej) => ff.stdin.write(buf, (e) => (e ? rej(e) : res())));

const t0 = Date.now();
for (let f = from; f < to; f++) {
  await write(await shoot(f, { type: "jpeg", quality: 92 }));
  const done = f - from + 1;
  if (done % 300 === 0 || f === to - 1) {
    const rest = ((Date.now() - t0) / done) * (to - from - done);
    console.log(`${done}/${to - from} フレーム（${Math.round((done / (to - from)) * 100)}%）残り約 ${Math.ceil(rest / 60000)} 分`);
  }
}
ff.stdin.end();
await ffDone;
await finish();

if (partial) {
  const out = join(root, `out/${name}.mp4`);
  spawnSync("mv", [silent, out]);
  console.log(`out/${name}.mp4（音声なし・${from}〜${to} フレーム）`);
  process.exit(0);
}

// ナレーションをつないで重ね、音量をそろえる（-16 LUFS）
const track = spawnSync("node", [join(root, "narration-track.mjs")], { stdio: "inherit" });
if (track.status !== 0) throw new Error("narration-track.mjs が失敗しました");
const out = join(root, `out/${name}.mp4`);
const mux = spawnSync(
  "ffmpeg",
  ["-v", "error", "-y", "-i", silent, "-i", join(root, "out/narration.wav"), "-c:v", "copy", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out],
  { stdio: "inherit" },
);
if (mux.status !== 0) throw new Error("音声の重ね合わせに失敗しました");
rmSync(silent, { force: true });
console.log(`out/${name}.mp4`);

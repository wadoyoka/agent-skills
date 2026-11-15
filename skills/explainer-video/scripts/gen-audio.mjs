// narration.json の各文を VOICEVOX エンジンで読み上げて wav にし、
// 各文の開始フレームとシーンの長さを timing.json に書く。
//
// 使い方（movie/ で実行）:
//   node gen-audio.mjs
//
// 読むもの: ./narration.json
// 書くもの: ./public/audio/<シーンID>-<文番号>.wav、./timing.json
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const narration = JSON.parse(readFileSync(join(root, "narration.json"), "utf8"));
const voice = narration.voicevox ?? {};
const url = process.env.VOICEVOX_URL ?? voice.url ?? "http://127.0.0.1:50021";
const speaker = voice.speaker;
if (speaker == null) {
  console.error("narration.json の voicevox.speaker（スタイル ID）がありません。voicevox-speakers.mjs で調べてください。");
  process.exit(1);
}

const FPS = narration.fps ?? 30;
const LEAD = 14; // シーン頭の無音（フレーム）
const GAP = 9; // 文と文のあいだ
const TAIL = 26; // シーン終わりの余白

const outDir = join(root, "public/audio");
mkdirSync(outDir, { recursive: true });

const synth = async (text, file) => {
  const q = await fetch(`${url}/audio_query?${new URLSearchParams({ text, speaker: String(speaker) })}`, { method: "POST" });
  if (!q.ok) throw new Error(`audio_query ${q.status}: ${text}`);
  const query = await q.json();
  Object.assign(query, {
    speedScale: voice.speedScale ?? 1.1,
    intonationScale: voice.intonationScale ?? 1.0,
    prePhonemeLength: 0.05,
    postPhonemeLength: 0.08,
    outputSamplingRate: 48000,
    outputStereo: false,
  });
  const s = await fetch(`${url}/synthesis?speaker=${speaker}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!s.ok) throw new Error(`synthesis ${s.status}: ${text}`);
  writeFileSync(file, Buffer.from(await s.arrayBuffer()));
};

const seconds = (file) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());

try {
  await fetch(`${url}/version`);
} catch {
  console.error(`VOICEVOX エンジン（${url}）につながりません。voicevox/ で make up してください。`);
  process.exit(1);
}

const scenes = [];
for (const scene of narration.scenes) {
  let cursor = LEAD;
  const lines = [];
  for (const [i, line] of scene.lines.entries()) {
    const name = `${scene.id}-${i}`;
    const wav = join(outDir, `${name}.wav`);
    await synth(line.say ?? line.sub, wav);
    const frames = Math.ceil(seconds(wav) * FPS);
    lines.push({ file: `audio/${name}.wav`, start: cursor, frames, sub: line.sub });
    cursor += frames + GAP;
  }
  const duration = cursor - GAP + TAIL;
  scenes.push({ id: scene.id, lines, duration });
  console.log(`${scene.id}: ${(duration / FPS).toFixed(1)}s`);
}

const total = scenes.reduce((s, x) => s + x.duration, 0);
writeFileSync(join(root, "timing.json"), JSON.stringify({ fps: FPS, total, scenes }, null, 2));
console.log(`合計: ${Math.floor(total / FPS / 60)}分${Math.round((total / FPS) % 60)}秒`);

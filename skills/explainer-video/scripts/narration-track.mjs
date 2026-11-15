// timing.json に従って、1 文ずつの wav を 1 本のナレーション（out/narration.wav）につなぐ。
// HTML 版は映像と音声を別々に作って最後に重ねるので、これで音声トラックを用意する。
//
// 使い方（movie/ で実行）:
//   node narration-track.mjs
//
// gen-audio.mjs が出す wav（48kHz・モノラル・16bit）を前提にする。
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const timing = JSON.parse(readFileSync(join(root, "timing.json"), "utf8"));
const RATE = 48000;

/** wav の fmt と data を読む。 */
const readWav = (file) => {
  const buf = readFileSync(file);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw new Error(`wav ではありません: ${file}`);
  let fmt;
  let data;
  for (let p = 12; p + 8 <= buf.length; ) {
    const id = buf.toString("ascii", p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === "fmt ") fmt = { channels: buf.readUInt16LE(p + 10), rate: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
    if (id === "data") data = buf.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error(`fmt か data がありません: ${file}`);
  if (fmt.channels !== 1 || fmt.rate !== RATE || fmt.bits !== 16) {
    throw new Error(`48kHz・モノラル・16bit ではありません（${fmt.rate}Hz・${fmt.channels}ch・${fmt.bits}bit）: ${file}`);
  }
  return data;
};

const totalSamples = Math.ceil((timing.total / timing.fps) * RATE);
const pcm = Buffer.alloc(totalSamples * 2);

let sceneStart = 0;
for (const scene of timing.scenes) {
  for (const line of scene.lines) {
    const data = readWav(join(root, "public", line.file));
    const offset = Math.round(((sceneStart + line.start) / timing.fps) * RATE) * 2;
    data.copy(pcm, offset, 0, Math.min(data.length, pcm.length - offset));
  }
  sceneStart += scene.duration;
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // モノラル
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);

mkdirSync(join(root, "out"), { recursive: true });
writeFileSync(join(root, "out/narration.wav"), Buffer.concat([header, pcm]));
console.log(`out/narration.wav（${(totalSamples / RATE).toFixed(1)} 秒）`);

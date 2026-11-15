// 英字・数字・記号を含む文について、VOICEVOX がどう読むか（カナ）を表示する。
// 読み違いを見つけたら、narration.json のその文に say（読み上げ用の書き方）を足す。
//
// 使い方（movie/ で実行）:
//   node check-readings.mjs            英数字を含む文だけ
//   node check-readings.mjs --all      すべての文
//   node check-readings.mjs 既定値 照合 生成   指定した言葉だけ
import { readFileSync } from "node:fs";
import { join } from "node:path";

const narration = JSON.parse(readFileSync(join(process.cwd(), "narration.json"), "utf8"));
const url = process.env.VOICEVOX_URL ?? narration.voicevox?.url ?? "http://127.0.0.1:50021";
const speaker = String(narration.voicevox?.speaker ?? 0);

const kana = async (text) => {
  const r = await fetch(`${url}/audio_query?${new URLSearchParams({ text, speaker })}`, { method: "POST" });
  if (!r.ok) throw new Error(`audio_query ${r.status}: ${text}`);
  return (await r.json()).kana.replace(/[/'_]/g, "");
};

const args = process.argv.slice(2);
const all = args.includes("--all");
const words = args.filter((a) => !a.startsWith("--"));

if (words.length) {
  for (const w of words) console.log(`${w} → ${await kana(w)}`);
} else {
  for (const scene of narration.scenes) {
    for (const [i, line] of scene.lines.entries()) {
      const text = line.say ?? line.sub;
      if (!all && !/[A-Za-z0-9/_.\-]/.test(text)) continue;
      console.log(`${scene.id}-${i}: ${await kana(text)}`);
    }
  }
}

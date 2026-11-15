// VOICEVOX の話者一覧と、話者ごとの利用規約を表示する。
// 規約は話者ごとに違う（商用可・非商用のみ・企業が関わるなら事前確認、など）。選ぶ前に必ず読む。
//
// 使い方:
//   node voicevox-speakers.mjs                話者名とスタイル ID の一覧
//   node voicevox-speakers.mjs --policies     全話者の規約の冒頭（比べる用）
//   node voicevox-speakers.mjs <話者名>       その話者の規約の全文
//
// 接続先は環境変数 VOICEVOX_URL（既定 http://127.0.0.1:50021）
const url = process.env.VOICEVOX_URL ?? "http://127.0.0.1:50021";

let speakers;
try {
  speakers = await (await fetch(`${url}/speakers`)).json();
} catch {
  console.error(`VOICEVOX エンジン（${url}）につながりません。voicevox/ で make up してください。`);
  process.exit(1);
}

const policy = async (uuid) => (await (await fetch(`${url}/speaker_info?speaker_uuid=${uuid}`)).json()).policy ?? "";

const arg = process.argv[2];
if (!arg) {
  console.log(`エンジン: ${url}（版 ${await (await fetch(`${url}/version`)).text()}）`);
  for (const s of speakers) console.log(`${s.name}: ${s.styles.map((x) => `${x.name}=${x.id}`).join(", ")}`);
} else if (arg === "--policies") {
  for (const s of speakers) console.log(`=== ${s.name}\n${(await policy(s.speaker_uuid)).replace(/\s+/g, " ").slice(0, 300)}\n`);
} else {
  const s = speakers.find((x) => x.name === arg);
  if (!s) {
    console.error(`「${arg}」という話者はいません。引数なしで一覧を出してください。`);
    process.exit(1);
  }
  console.log(`=== ${s.name}（${s.styles.map((x) => `${x.name}=${x.id}`).join(", ")}）\n`);
  console.log(await policy(s.speaker_uuid));
}

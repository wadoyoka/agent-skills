// 動画づくりで使う依存に、既知の脆弱性がないかを trivy で確かめる。
//
// 使い方（movie/ で実行）:
//   node scan-deps.mjs                  package.json の npm 依存（Remotion・playwright-core など）。npm ci の前に実行する
//   node scan-deps.mjs --image <image>  Docker イメージ（VOICEVOX エンジン）。立ち上げる前に実行する
//
// npm: パッケージは入れずに（install scripts も動かさずに）package-lock.json だけを作り直し、それを調べる。
//      devDependencies も含め、HIGH / CRITICAL が 1 件でもあれば「見つかった」とする。
// image: CRITICAL が 1 件でもあれば「見つかった」とする。
//
// 終了コード: 0 = 見つからなかった / 1 = 見つかった / 2 = trivy が無い / 3 = 調べられなかった
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const imageAt = args.indexOf("--image");
const image = imageAt >= 0 ? args[imageAt + 1] : undefined;
if (imageAt >= 0 && !image) {
  console.error("--image のあとにイメージ名を書いてください（例: voicevox/voicevox_engine:cpu-ubuntu20.04-latest）。");
  process.exit(3);
}

const run = (cmd, argv) => spawnSync(cmd, argv, { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

const version = run("trivy", ["--version"]);
if (version.error || version.status !== 0) {
  console.error("trivy が見つかりません。依存を入れる前に止めます。");
  console.error("入れ方: brew install trivy（macOS）/ mise use -g trivy（mise を使っている場合）/ ほかは https://trivy.dev/");
  process.exit(2);
}
console.log(`trivy ${version.stdout.match(/Version:\s*(\S+)/)?.[1] ?? "?"}`);

let target;
let severity;
let direct = new Set();
if (image) {
  target = image;
  severity = "CRITICAL";
} else {
  if (!existsSync(join(root, "package.json"))) {
    console.error("package.json がありません。movie/ で実行してください。");
    process.exit(3);
  }
  // package.json を直した（版上げ・overrides）あとでも、ここで lockfile が追いつく。
  const lock = run("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"]);
  if (lock.status !== 0) {
    console.error(`package-lock.json を作れませんでした。\n${lock.stderr}`);
    process.exit(3);
  }
  // 「直接」は package.json に名前があり、かつ lockfile の最上位（node_modules/<名前>）に入る版。
  // 同じ名前でも、ほかのパッケージの下に入れ子で入った古い版は「間接」（package.json の版を上げても直らない）。
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const locked = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8")).packages ?? {};
  for (const name of [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]) {
    const version = locked[`node_modules/${name}`]?.version;
    if (version) direct.add(`${name}@${version}`);
  }
  target = "package-lock.json";
  severity = "HIGH,CRITICAL";
}

console.log(`調べる: ${target}（${severity}）`);
const scan = run("trivy", [
  image ? "image" : "fs",
  "--scanners", "vuln",
  "--severity", severity,
  ...(image ? [] : ["--include-dev-deps"]),
  "--format", "json",
  "--quiet",
  "--skip-version-check",
  target,
]);
let report;
try {
  report = JSON.parse(scan.stdout);
} catch {
  console.error(`trivy が失敗しました（初回は脆弱性データベースの取得にネットワークが要る）。\n${scan.stderr}`);
  process.exit(3);
}

const os = report.Metadata?.OS;
if (os?.EOSL) console.log(`注意: ベースの OS（${os.Family} ${os.Name}）はサポートが終わっている。OS の脆弱性は見つからないことがある。`);

const found = [];
for (const r of report.Results ?? []) {
  for (const v of r.Vulnerabilities ?? []) found.push({ ...v, where: r.Target });
}
if (found.length === 0) {
  console.log(`見つからなかった（${severity} は 0 件）。`);
  process.exit(0);
}

console.log(`見つかった: ${found.length} 件\n`);
for (const v of found) {
  const kind = image ? v.where : direct.has(`${v.PkgName}@${v.InstalledVersion}`) ? "直接" : "間接";
  console.log(`${v.Severity.padEnd(8)} ${v.PkgName}@${v.InstalledVersion}  ${v.VulnerabilityID}  [${kind}]`);
  console.log(`         直る版: ${v.FixedVersion || "なし"}  ${v.Title ?? ""}`);
}
if (!image) console.log("\nどこに・どの版が入るかは npm ls --package-lock-only <パッケージ名> で分かる（npm ci の前でも使える）。");
process.exit(1);

# HTML 版の作り方（Remotion を使わない）

Remotion の規約に当たる場合や、立場が分からない場合に使う。使うのは HTML・CSS・JS と、
ページを撮るための Playwright（`playwright-core`、Apache-2.0）と ffmpeg だけ。

## 仕組み

1. `index.html` にシーンを `<section>` で並べる。
2. `runtime.js` の `renderFrame(n)` が、n フレーム目の見た目（どのシーンか・どの要素がどこまで出たか・字幕）を DOM に直接描く。
3. `render.mjs` がページを開き、`renderFrame(n)` → 撮影、を全フレーム繰り返して ffmpeg に流し込む。
4. 1 文ずつの音声を `narration-track.mjs` で 1 本につなぎ、映像に重ねて音量をそろえる。

フレームごとに状態を計算して描くので、何度書き出しても同じ映像になる。
**CSS の `transition` や `@keyframes` は使わない。** 撮る瞬間に途中の状態がずれるため。動きはすべて `runtime.js` の指定か、シーンごとのフックで書く。

## 用意

```bash
SKILL=<このスキルのディレクトリ>
mkdir -p movie && cp -R "$SKILL/assets/html/." movie/
cp "$SKILL"/scripts/*.mjs "$SKILL/scripts/contact-sheet.sh" movie/
cp "$SKILL/assets/narration.example.json" movie/narration.json
cd movie
node scan-deps.mjs   # 入れる前に trivy で脆弱性を調べる。0 なら次へ。1 なら dependency-scan.md
npm ci               # 調べた package-lock.json のとおりに入れる
```

`scan-deps.mjs` が 0 で終わるまで `npm ci` しない。見つかったときの直し方と止め方は `dependency-scan.md`。

ブラウザは、入っている Google Chrome → Microsoft Edge → Playwright の Chromium の順に探す。
どれも無ければ `npx playwright-core install chromium`。

## シーンの書き方

```html
<section class="scene" data-scene="flow">
  <div class="head"><div class="part" data-part></div><div class="title">見出し</div></div>
  <div class="body">
    <div class="card" data-at="1" data-anim="scale" data-active="1~2">1 文目で出て、1 文目のあいだ光る</div>
    <div class="arrow" data-grow="2"></div>
    <span data-at="3" data-count="0..128"></span>
  </div>
</section>
```

| 指定 | 動き |
|---|---|
| `data-at="n"` | n 文目に合わせて出す。`"n+10"` は 10 フレーム後、`"end"` は最後の文の終わり |
| `data-anim` | 出方。`up`（既定）・`down`・`left`・`right`・`scale`・`fade` |
| `data-active="n~m"` | n 文目から m 文目の手前まで CSS 変数 `--on` を 0→1。`.card` の枠や `.hl` の表示に効く |
| `data-grow="n"` | n 文目から CSS 変数 `--p` を 0→1。`.arrow` が伸びる |
| `data-count="0..128"` | `data-at` から数を数え上げる。`data-dur` でフレーム数を変える |
| `data-part` | `narration.json` の `part`（章名）が入る |

シーン固有の動き（ファイルが画面を移動する、など）はフックで書く:

```html
<script>
  window.sceneHooks = window.sceneHooks || {};
  window.sceneHooks.flow = (local, api) => {
    const p = api.progress(api.cue(3, 8), 36);   // 3 文目の 8 フレーム後から 36 フレームかけて 0→1
    api.el.querySelector(".file").style.transform = `translate(${-600 * p}px, ${-80 * Math.sin(p * Math.PI)}px)`;
  };
</script>
```

（`runtime.js` より前に置く。）

部品のクラス: `.card`・`.pill`・`.code`・`.codeblock`・`.badge`・`.icon`・`.arrow`・`.shot`（`<img>` を入れる）・`.hl`（強調枠）・
`.row`・`.center`。色は CSS 変数（`--accent`・`--sub`・`--panel` など）を使えば、シーンの `theme` に合わせて切り替わる。
変数の値は `style.css` の `[data-theme="light"]` / `[data-theme="dark"]` にあり、動画ごとに設計メモの「見た目」に合わせて書き換える。
`index.html` に入っている見本シーンは書き方の見本なので、中身は依頼に合わせて書き換える。
アイコンは `<svg class="icon"><use href="#i-名前" /></svg>`。足りなければ `index.html` 冒頭の `<symbol>` に足す。

### 崩れやすいところ

- 本文の枠は 1680×650px（上 230px・下 200px は空ける）。横に並べる幅の合計をそれ以内にする。
- スクリーンショットの強調枠 `.hl` は、`.shot` の中に `position: absolute` で、元画像の CSS ピクセル × 表示倍率で置く。

## 確かめる・書き出す

```bash
node render.mjs --preview             # ブラウザで再生して確かめる（ナレーションも鳴る）
node render.mjs --stills              # 全シーンの静止画 → out/stills/
bash contact-sheet.sh out/sheet out/stills/*.png
node render.mjs --from 0 --to 300     # 一部だけ書き出して動きを確かめる（音声なし）
node render.mjs --name intro          # 全体を書き出す → out/intro.mp4（音量もそろう）
```

速さの目安: 1080p で毎秒 20 フレーム前後（Apple シリコンの Mac で計測）。9 分の動画なら 15 分ほどかかる。
バックグラウンドで動かすと、300 フレームごとに進み具合と残り時間を出す。

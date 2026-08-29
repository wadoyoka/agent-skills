# デザインシステム リファレンス（グラレコ＝手描き板書風）

`assets/template.html` の `<style>` に組み込まれた見た目の約束事。このスキルの出力は**常にグラレコ（マーカーで手描きした「板書／スケッチノート」）風**で、下で定義したクラスを使い回して記事全体の一貫性を保つ。

見た目のレイヤーがグラレコというだけで、譲れない約束（日本語・初心者ファースト・各概念に必ず図・色は意味・全体像→部品→まとめ・a11y）は装飾に関わらず不変。構成は `structure-guide.md`、図の作法は `svg-guide.md`（このガイドと併読）に従う。

## このスタイルの要点（手順）

1. 構成は `structure-guide.md` 通りに設計する。
2. 下地は `assets/template.html` をコピーする。
3. 各セクションを埋める。図は `svg-guide.md` の型を選び、**下の「図を手描き化する」**に従ってマーカー風に化粧する。
4. 装飾クラスはこのガイドの「パーツ集」を使う（`.banner`／`.badge`／`.note`／`.bubble`／`.hl` など）。
5. 出す前に末尾の「グラレコの自己批評」を通す。

---

## 配色（マーカー on 方眼紙）

色は「飾り」ではなく「意味」。4つの役割をマーカー色に割り当て、全図・全文で一貫させる（読者は色で役割を推測する）。

| 変数 | 色 | 意味・使いどころ |
|------|-----|-----------------|
| `--ink` | 温かい黒 `#2B2A26` | すべての**枠線と本文**。マーカーの主線 |
| `--paper` | クリーム `#FBF7EC` | 背景（フリップチャート紙・無地） |
| `--blue` | 青 `#2E7DB5` | 構造・つなぎ・番号・中立の箱 |
| `--coral` | 朱 `#EA5A3D` | **主役・強調・signature**。矢印の走る色 |
| `--green` | 緑 `#4E9A51` | 正しい・ゴール・うれしい結論 |
| `--crimson` | 赤 `#C64444` | 危険・×（使用は控えめに） |
| `--sun` | 黄 `#FFC93C` | 蛍光ペンのハイライト・元気・星 |
| `--shadow` | 紙色グレー `#D9CFB6` | 手描きのドロップシャドウ（ぼかさない） |

淡いインク（付箋・吹き出し・箱の塗り）: `--wash-blue #DDEAF4` / `--wash-coral #FBE1D7` / `--wash-green #DEEFD8` / `--wash-sun #FFF0C2`。

**原則**: 塗りは wash 系の淡色、枠は必ず `--ink`、走る線と主役は `--coral`。色数を増やしすぎない。

## フォント

- **Yusei Magic**（マーカー体）: h1・バナー・番号・図中の強いラベル・figcaption・表見出し。「太いフェルトペン」の役。単一ウェイトなので**大きさと色で階層をつける**。
- **Zen Kurenaido**（ペン体）: 本文・付箋・吹き出し。手書きだが長文でも読める。**行間は 1.9〜2.0**、本文は 15px 以上を保つ（手書き体は詰めると読みにくい）。
- **JetBrains Mono**: コードと `.term` チップだけ。「機械が扱うもの」の記号。

## signature 技法：手描きの箱（`.sketch`）

グラレコの手描き感は、**いびつな `border-radius` ＋ ぼかさない斜めの影**で作る（rough.js など外部ライブラリは使わない＝単一ファイルの約束を守る）。文字は歪まないので読みやすさは保たれる。

```css
.sketch{
  background:var(--card);
  border:2.5px solid var(--ink);
  border-radius:255px 14px 235px 14px/14px 245px 15px 255px; /* 4隅を大小バラす＝手描きの歪み */
  box-shadow:6px 7px 0 -1px var(--shadow);                   /* blur=0 の影＝マーカーの立体 */
}
.sketch.alt{ border-radius:14px 245px 14px 255px/235px 14px 255px 15px; } /* 隣同士で交互に使うと単調にならない */
```

図の枠 `figure` にも隣り合うたび `.sketch` / `.sketch alt` を交互に当てる。

## パーツ集（コピーして使う）

### セクション見出し：番号バッジ ＋ マーカーバナー
番号は**手描きの丸**（バッジ）、タイトルは**マーカーのバナー**。バナー色は章の役割で `blue`（全体像・中立）／既定の coral（主役の概念）／`green`（まとめ）を選ぶ。SVGの `id` は図ごとに一意にする。

```html
<div class="head">
  <svg class="badge" viewBox="0 0 60 60" role="img" aria-label="ステップ1">
    <path d="M30 4 C44 3 57 15 56 30 C57 45 44 57 30 56 C16 57 3 45 4 30 C3 15 16 3 30 4 Z" fill="#FFC93C" stroke="#2B2A26" stroke-width="2.5"/>
    <text x="30" y="40" text-anchor="middle" font-family="Yusei Magic,sans-serif" font-size="28" fill="#2B2A26">1</text>
  </svg>
  <span class="banner blue">まず全体像：〜はどこを通る？</span>
</div>
```
まとめの章は、丸バッジの代わりに**星バッジ**（テンプレ末尾のパスを流用）＋ `banner green` にすると締まる。

### つなぎの大矢印（章と章の間＝“一枚の流れ”を作る signature）
**大きな手描き矢印**を各セクションの間に置き、ページ全体を“一枚の流れ”に見せる。左右の曲がりを交互（`C34…` と `C62…`）にすると手描きらしい。

```html
<div class="arrow">
  <svg viewBox="0 0 96 84" role="img" aria-label="下へ続く矢印" id="veArrowN">
    <style>@keyframes veArrowNDash{to{stroke-dashoffset:-36}}#veArrowN .flow{animation:veArrowNDash 3.2s linear infinite}@media (prefers-reduced-motion:reduce){#veArrowN .flow{animation:none}}</style>
    <path d="M48 6 C34 26 62 44 48 66" fill="none" stroke="#2B2A26" stroke-width="4" stroke-linecap="round"/>
    <path class="flow" d="M48 6 C34 26 62 44 48 66" fill="none" stroke="#EA5A3D" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 16"/>
    <path d="M33 55 L48 72 L63 54" fill="none" stroke="#2B2A26" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</div>
```

### 吹き出し（`.bubble`）— 導入文を facilitator のセリフに
HERO の lede に使う。左下にしっぽが出る。

```html
<div class="bubble">これから何を、どんな順で描くか。最後に初心者への一言。</div>
```

### 付箋（`.note` / warn / good / info）— コールアウト
マスキングテープ付きの付箋。色で役割を出す。`<span class="pin"></span>` を先頭に入れるとテープが付く。

```html
<div class="note warn"><span class="pin"></span><b>落とし穴：</b> 誤解しやすい点を短く。</div>
```
`note`(黄=補足) / `note info`(青=前提) / `note warn`(赤=注意) / `note good`(緑=うれしい結論)。

### 文中の装飾
```html
<span class="hl">一番言いたい一文</span>   <!-- 蛍光ペンのスウォッシュ。1段落1回 -->
<span class="term">用語</span>            <!-- 手描きの名札チップ。初出で意味を添える -->
<strong>強め</strong>                     <!-- 朱色。hl より軽い強調 -->
```
見出し中で主役の語を囲むときは `<span class="accent">語</span>`（蛍光ペン枠）や `<span class="u">語</span>`（二度引き下線）を使う。

### 図の枠（`figure` / `figcaption`）
```html
<figure>  <!-- 隣り合うたびに .sketch / .sketch alt を交互に当てる -->
  <svg viewBox="0 0 800 210" role="img" aria-label="図の説明">…</svg>
  <figcaption>この図で一番言いたいこと（1行）</figcaption>
</figure>
```
`figcaption` は「何の図か」ではなく **「だから何が言えるか」** を書くと効く。文字はマーカー体（Yusei Magic）。

### コードブロック（`.code`）
技術トピックで、コードが理解を助ける時だけ使う。Mac風のウィンドウバー付き。**「言いたい1点」に絞った最小例**にし、全部は貼らない。`<pre><code>` の中は**インデントを付けない**（`white-space:pre` でそのまま出る）。

```html
<div class="code">
  <div class="bar"><i style="background:#FF5F57"></i><i style="background:#FEBC2E"></i><i style="background:#28C840"></i><span class="f">ファイル名.ext</span></div>
<pre><code><span class="c-com">// コメント</span>
<span class="c-key">const</span> x = <span class="c-fn">fn</span>();</code></pre>
</div>
```
シンタックス色クラス: `c-key`(キーワード) / `c-com`(コメント) / `c-str`(文字列) / `c-num`(数値) / `c-fn`(関数名) / `c-tag`(タグ名) / `c-accent`(差分・注目行)。コードとインライン `.term` だけ JetBrains Mono。

### まとめテーブル（`.stack`）
記事末で「誰が・いつ・どこで働くか」を1枚に畳む定番。見出しの章は `banner green` にすると締まる。

```html
<table class="stack">
  <thead><tr><th>要素</th><th>役割</th><th>働く場所</th></tr></thead>
  <tbody><tr><td>A</td><td>…</td><td>…</td></tr></tbody>
</table>
```
1列目はモノスペースで「名前」を表す。3〜4列に収めると視線が流れやすい。

### スクロール出現（`.reveal`）
`<section class="reveal">` にするとスクロールで下からふわっと出現する（JS + IntersectionObserver、テンプレ内蔵）。`prefers-reduced-motion` では自動で無効化されるので安全。装飾アニメは意味を持たせず、内容の理解を邪魔しない範囲に留める。

### もくじサイドバー（`nav.toc`）と読み進みバー（`.progress`）
本文の左余白に固定される、マステで貼った付箋のような目次。**中身は書かない**——テンプレ末尾のスクリプトが各 `<section>` の `.banner`（章タイトル）と `.badge`（番号。まとめの章は `✔`）を読んで自動生成し、`id` も自動で振る。章を足す＝`<section>` を足すだけで目次も増える。

- **見た目**: `.sketch` と同じいびつな角丸＋斜めの影の箱に、上辺へマステ（`.note .pin` と同じ質感）。見出し「もくじ」は Yusei Magic で `rotate(-1deg)`。新しい色は使わず既存の変数だけで組む。
- **現在地**: 本文の `.hl` と同じ蛍光ペンのスウォッシュ＋番号バッジが朱色＋左端に朱色の耳。色だけに頼らず「形が増える」ことでも示し、`aria-current="true"` を付ける。
- **判定**: 画面上から30%の線を越えた最後の章が現在地。ページ末尾では必ず最後の章（短いまとめの章は線に届かないため）。
- **本文には干渉しない**: `position:fixed` なので `.wrap` の位置・行長は目次があってもなくても同じ。幅 1300px 未満では目次は消え、代わりに上端 4px の進捗バーだけが出る。印刷時は両方消える。

章が10個を超えても箱は `74vh` で頭打ちになり、中のリストだけがスクロールする。目次を長くしないためにも、章タイトル（`.banner`）は**画面外まで伸びない短さ**に保つ。

## 図の手描きルール（部品はもうグラレコ済み）

`assets/svgs/` の部品14枚は**すでにこの見た目で描かれている**。貼ったあとにやるのはラベル・数・意味色の差し替えだけで、
**変換作業は不要**。下のルールが要るのは、**ゼロから図を描くとき**と、部品を大きく作り替えるときだけ。

1. **線を太く・丸く**: `stroke-width` を 2.5〜3.5、`stroke-linecap="round"` `stroke-linejoin="round"`。
   矢印の先は `<polygon>` の三角でなく **V字の2本線**（`<path d="M.. L.. L.." fill="none">`）で描く。
2. **枠は必ず ink・塗りは cream か wash**: `stroke="#2B2A26"`、`fill` は `#FFFDF7`（カード）か wash 色。
   **意味の色は枠ではなく、走る線・ラベル・✓/× に載せる**（枠まで色を変えると手描きの統一感が崩れる）。
3. **紙を敷く**: 図の一番下に `<rect x="0" y="0" width="800" height="H" rx="14" fill="#FBF7EC"/>`。
4. **ラベルはマーカー体**: 強いラベル＝`Yusei Magic,sans-serif`、補足＝`Zen Kurenaido,sans-serif`、
   記号・コード片＝`JetBrains Mono,monospace`。走る線と主役ラベルは `#EA5A3D`。
5. **雲・星などの手描き記号**は `<path>` のベジェ曲線でラフに描く（テンプレのリモート雲・星バッジが手本）。

部品全体で守っている“文法”は2つ。作り替えるときも崩さない:

- **影つきの箱は1図に1つだけ**＝その図の主役。本体と同じ `<rect>` を5px右・6px下にずらして `fill="#D9CFB6"` で先に敷き、その上に本体を描く（ぼかさない影＝`.sketch` と同じ技法）。
- **ink の破線枠**＝「まだ整っていない／避けたい状態」、実線＝確定。赤ラベルと `⚠` `×` を添える。

`viewBox="0 0 800 H"`・`role="img"`・`aria-label`・`class="flow"` の作法は `svg-guide.md` と全く同じ。流れる破線は同じ仕組みで動く。

## a11y と読みやすさ（グラレコで特に注意）

- 手描き体は小さいと読みにくい。**本文 15px 以上・行間 1.9 以上**を守る。図中ラベルも 11px 未満にしない。
- コントラスト: 文字は `--ink`（濃い）を基本に。淡い wash の上に薄い色を重ねない。
- 色だけに頼らない: 赤/緑には「×」「✓」やラベル語を併記（`svg-guide.md` 同様）。
- `role="img"` と `aria-label`、`prefers-reduced-motion` 尊重（テンプレ内蔵）、`:focus-visible`（キーボード操作の可視化）は必須。

## グラレコの自己批評（Chanel の鏡）

出す前に一度引きで眺め、**盛りすぎを1つ削る**。

- 回転（rotate）を持つ要素が多すぎないか？ 角度は全て -1.5°〜0° 程度の弱い同方向に留め、章ごとにバラバラの向きにしない。
- 影・歪み・テープ・蛍光ペンが**全部の要素に**乗っていないか？ 主役以外は落ち着かせる。
- 色は5色以内に収まっているか？ wash と主役以外に色を足していないか。
- 手描き感はページ全体で**同じ技法**（`.sketch` の歪み）で統一されているか。技法を混ぜない。

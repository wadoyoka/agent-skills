# Remotion 版の作り方

Remotion は、React で書いた画面を 1 フレームずつ描いて動画にするライブラリ。
使ってよいかは `licensing.md` で確かめてから使う。

## 用意

```bash
SKILL=<このスキルのディレクトリ>
mkdir -p movie && cp -R "$SKILL/assets/remotion/." movie/
cp "$SKILL"/scripts/*.mjs "$SKILL/scripts/contact-sheet.sh" movie/
cp "$SKILL/assets/narration.example.json" movie/narration.json   # 原稿の下書きに使う
cd movie
node scan-deps.mjs   # 入れる前に trivy で脆弱性を調べる。0 なら次へ。1 なら dependency-scan.md
npm ci               # 調べた package-lock.json のとおりに入れる
```

- `scan-deps.mjs` が 0 で終わるまで `npm ci` しない。見つかったときの直し方と止め方は `dependency-scan.md`。
- 入れたら `node_modules/remotion/LICENSE.md` を読み、規約が変わっていないか確かめる。
- 新しい npm は install scripts を止めた警告を出すことがあるが、4.0.543 ではそのままで動く。
- 初回の静止画・書き出しで、Remotion がヘッドレスの Chrome（約 170MB）を取得する。

## ファイルの役割

| ファイル | 役割 | 触るか |
|---|---|---|
| `src/scenes.tsx` | シーンの中身。`SCENES` に `id` と同じ名前で登録する。入っている見本シーンは書き方の見本なので、中身は依頼に合わせて書き換える | 書く |
| `src/kit.tsx` | 色・部品・出し方。色（`light` / `dark`）は動画ごとに設計メモの「見た目」に合わせて書き換える。アイコンが足りなければ `ICONS` に足す | 書く（色）・必要なら（部品） |
| `src/Video.tsx` | シーンを並べ、音声・字幕・進み具合・クレジットを重ねる | 原則触らない（字幕の大きさを変えるときだけ） |
| `src/Root.tsx` | 1920×1080・fps・長さの設定（`timing.json` から読む） | 触らない |
| `stills.mjs` | 確認用の静止画を出す | 触らない |

`scenes.tsx` にまだ無いシーンは仮の表示になるので、書き途中でも全体を通して確かめられる。

## シーンの書き方

```tsx
const MyScene: React.FC = () => {
  const t = useTheme();      // 色（t.accent, t.sub, t.panel …）
  const cue = useCue();      // cue(i) = i 文目が始まるフレーム
  return (
    <Scene title="見出し">     {/* 章名（part）と見出しを上に出し、本文の枠を作る */}
      <Reveal at={cue(1)}>     {/* 1 文目に合わせて出す */}
        <Card glow={useActive(cue(1), cue(2))}>…</Card>   {/* 1 文目のあいだだけ枠を光らせる */}
      </Reveal>
    </Scene>
  );
};
```

| 部品 | 使いどころ |
|---|---|
| `Scene` | 見出しつきのふつうのシーン。本文は 1680×650px の枠に入る |
| `Frame` | 見出しなしの全面（タイトル・章の扉・おわり） |
| `Reveal` | `at` のフレームで出す。`dx` / `dy` で向き、`scale` で拡大しながら |
| `useActive(start, end)` | その間だけ 1。`Card` の `glow` や `Highlight` の `on` に渡す |
| `useSpring(at, dur)` | 0→1 の値が欲しいとき（自分で動かす場合） |
| `Card` / `Pill` / `Code` / `CodeBlock` | カード・小さな札・文中のコード・複数行のコード |
| `Shot` + `Highlight` | スクリーンショットと、その上の強調枠 |
| `Arrow` | 横向きの矢印。`progress` で伸ばす |
| `Icon` / `IconBadge` | 線画アイコン。名前は `kit.tsx` の `ICONS` |

数を数え上げる、ファイルが画面を移動する、などの動きは、`useCurrentFrame()` と `interpolate()` で自分で書く。

### 崩れやすいところ

- 横に並べる要素の幅の合計を 1680px 以内にする。はみ出しは静止画で見つけて直す。
- ファイル名・パス・コードは折り返すと読めないので `whiteSpace: "nowrap"`（`Code` は最初から付いている）。
- スクリーンショットの強調枠は、元画像の CSS ピクセル座標 × 表示倍率で置く。座標は撮ったときと同じビューポートで測る。
- `map` の中で `useActive` などのフックを呼んでよいのは、並べる数が固定のときだけ。

## 確かめる・書き出す

```bash
npx remotion studio                  # ブラウザで再生しながら確かめる（任意）
node stills.mjs                      # 全シーンの静止画 → out/stills/
bash contact-sheet.sh out/sheet out/stills/*.png
npx remotion render Main out/video.mp4 --codec=h264 --crf=20 --audio-codec=aac
```

- 書き出しはバックグラウンドで動かす。既定の表示で「Rendered n/N」が出るので、聞かれたら進み具合を答えられる。
- Remotion の出力は音量がそろっていない（小さめ）。`qa.md` の手順で音量をそろえたものを完成品にする。

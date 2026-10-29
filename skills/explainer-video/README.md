# explainer-video

**ナレーション（VOICEVOX）と字幕つきの動画（MP4・1080p）**をコードで作るエージェントスキル。
動画編集ソフトは使わない。題材・聞き手・目的は問わない。

「小学 4 年生向けに光合成のしくみを動画にして」「取引先に新機能を売り込む 90 秒の動画」
「新人向けに開発を始めるまでの手順を動画で」「v1.2 から v1.3 の変更点を、使う人向け → 開発する人向けの順で」
のような依頼に反応する。依頼ごとに聞き手・ゴール・構成の型・長さ・トーン・見た目・声を設計メモ（`movie/brief.md`）に決め、
材料を読んで原稿を書き、VOICEVOX で読み上げ、その音声の長さに合わせて図・本物の画面・字幕を動かした MP4 を書き出す。

## 特徴

- **依頼ごとに中身を設計する**: 決まった型に当てはめず、聞き手（子ども・一般の人・お客さん・決める立場の人・専門家）と
  目的（解説・手順・紹介・変更点・比較・提案・報告・授業・事例・短い告知）に合わせて、構成・言葉づかい・長さ・配色・声を選ぶ。
- **規約を先に確かめる**: 作る前に利用者の立場（個人・営利・非営利）を聞き、Remotion を使ってよいかを決める。
  使えない、または分からない場合は、HTML/CSS/JS を Playwright で 1 フレームずつ撮って ffmpeg でつなぐ版で作る。
  声も、話者ごとの規約を読んで用途に合うものだけを選び、クレジットを動画に入れる。
- **過程を隠さない**: 作業はユーザーの作業ディレクトリの `movie/` で行う。原稿・音声・シーンのコード・確認用の静止画が残り、
  あとから自分で直して作り直せる。
- **画面とナレーションがずれない**: 1 文ずつ音声を作り、その開始フレームに合わせて要素を出す。

## 必要なもの

- Node.js（18 以上）と ffmpeg
- VOICEVOX エンジン（無ければ `assets/voicevox/` の `docker-compose.yml` で立ち上げる。Docker が要る）
- HTML 版のみ: Google Chrome か Microsoft Edge（無ければ `npx playwright-core install chromium`）

## ディレクトリ構成

```
explainer-video/
├── SKILL.md                             スキル本体（制作手順）
├── README.md                            このファイル
├── agents/
│   ├── claude/explainer-video.md        Claude Code サブエージェント（YAML frontmatter）
│   └── codex/explainer-video.toml       Codex サブエージェント（TOML）
├── scripts/
│   ├── setup.sh                         Claude Code / Codex への接続スクリプト
│   ├── gen-audio.mjs                    原稿 → 音声（VOICEVOX）と timing.json
│   ├── check-readings.mjs               英数字を含む文の読み（カナ）を表示
│   ├── voicevox-speakers.mjs            話者一覧と規約の表示
│   ├── narration-track.mjs              1 文ずつの音声を 1 本につなぐ（HTML 版）
│   └── contact-sheet.sh                 静止画 4 枚を 2×2 の 1 枚にまとめる
├── assets/
│   ├── voicevox/                        VOICEVOX エンジンの docker-compose.yml と Makefile
│   ├── narration.example.json           原稿の見本
│   ├── remotion/                        Remotion 版のテンプレート
│   └── html/                            HTML 版のテンプレートと書き出しスクリプト
└── references/
    ├── licensing.md                     Remotion・VOICEVOX・OS の読み上げ音声の規約
    ├── script-writing.md                構成の型、聞き手・場面に合わせた書き方、字幕と読みの書き分け
    ├── remotion.md                      Remotion 版の作り方
    ├── html-pipeline.md                 HTML 版の作り方
    └── qa.md                            静止画の確認と、書き出し後の確認
```

## VOICEVOX エンジンの立ち上げ

```bash
cp -R assets/voicevox <作業ディレクトリ>/movie/voicevox
cd <作業ディレクトリ>/movie/voicevox
make up      # 立ち上げ（初回はイメージの取得に時間がかかる）
make ps      # 状態
make logs    # ログ
make down    # 止める
```

`http://127.0.0.1:50021` で待ち受ける。自分の端末からだけ受け付け、同じ LAN の他の端末からは届かない。

## セットアップ

```bash
./scripts/setup.sh              # Claude Code + Codex（Codex は導入済みのときだけ）
./scripts/setup.sh --dry-run    # 何もせず、実行内容だけ表示
./scripts/setup.sh --help
```

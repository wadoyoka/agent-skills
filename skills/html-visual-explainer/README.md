# html-visual-explainer

質問に対して、**インラインSVGの図解つき・日本語・単一ファイルのHTML解説ページ**を1枚生成するエージェントスキル。
見た目はマーカーで手描きした板書＝**グラレコ風**で固定。

「HTMLで説明して」「図解して」「解説ページにして」のような依頼に反応し、
HERO（つかみ）→ 全体像 → 各概念を1つずつ → まとめ表、という初心者を置いていかない順序で書き上げる。
トピックは技術に限らない（一般教養・ビジネス・科学なども可）。

## ディレクトリ構成

```
html-visual-explainer/
├── SKILL.md                               スキル本体（制作手順）
├── README.md                              このファイル
├── agents/
│   ├── claude/html-visual-explainer.md    Claude Code サブエージェント（YAML frontmatter）
│   └── codex/html-visual-explainer.toml   Codex サブエージェント（TOML）
├── scripts/
│   └── setup.sh                           Claude Code / Codex への接続スクリプト
├── assets/
│   ├── template.html                      出力の下地（グラレコの全パーツが実例入り）
│   └── svgs/                              figure に貼るSVG部品14種 + カタログ
└── references/
    ├── structure-guide.md                 説明順序・セクションの型・書き方7則
    ├── svg-guide.md                       関係→図の型の早見表、viewBox・配色・a11y
    └── design-system.md                   マーカー配色・手書きフォント・装飾パーツ
```

`SKILL.md` は Claude Code と Codex の**両方が同じ形式で読む**（`name` と `description` の frontmatter が必須）。
ハーネス固有なのは `agents/` 配下のサブエージェント定義だけ。

## セットアップ

```bash
./scripts/setup.sh              # Claude Code + Codex（Codex は導入済みのときだけ）
./scripts/setup.sh --dry-run    # 何もせず、実行内容だけ表示
./scripts/setup.sh --help
```

リポジトリ直下の `../../setup.sh` からも一括で実行できる。

### 何が起きるか（すべてシンボリックリンク）

| | 接続先 | リンク元 |
|---|---|---|
| Claude Code スキル | `~/.claude/skills/html-visual-explainer` | このディレクトリ |
| Claude Code サブエージェント | `~/.claude/agents/html-visual-explainer.md` | `agents/claude/…md` |
| Codex スキル | `~/.agents/skills/html-visual-explainer` | このディレクトリ |
| Codex サブエージェント | `~/.codex/agents/html-visual-explainer.toml` | `agents/codex/…toml` |

すべてシンボリックリンクなので、**リポジトリ側を編集すればそのまま反映される**（再実行不要）。

既存の実体ファイル／ディレクトリがあった場合は `~/.agent-skills-backups/` に
`<出所>--<名前>.bak.<日時>` として退避してから張り替える。
（`~/.claude/skills/` や `~/.agents/skills/` の中に退避すると、`.bak` ディレクトリまで
**重複スキルとして読み込まれてしまう**ため外に出す。）

取り外しは `./scripts/setup.sh --uninstall`（このリポジトリを指すリンクだけを外す。退避ファイルは戻さない）。

## 使い方

### Claude Code

セットアップ後は**自動で発火**する。「〜をHTMLで図解して」のように頼めばよい。

```
OAuth 2.0 の認可コードフローを図解して
```

明示的に呼ぶ場合:

- スキルとして: `/html-visual-explainer`
- サブエージェントとして: 「html-visual-explainer エージェントで〜を解説して」

### Codex

Codex は `~/.agents/skills/` を USER レベルのスキル探索パスとして走査するので、
**スキルはリンクを張るだけで自動発火する**（`config.toml` への登録は不要）。

サブエージェントとして明示的に委譲する場合は、TOML の `name` フィールドの値で呼ぶ:

```
html_visual_explainer に OAuth 2.0 の認可コードフローを図解させて
```

> Codex はファイル名ではなく TOML 内の `name` を識別子に使う。
> ファイル名は `html-visual-explainer.toml`、エージェント名は `html_visual_explainer`（Codex 公式の命名慣習に合わせている）。

Codex 未インストールの状態でも `--with-codex` を付ければ先に配置できる。

#### Codex 側の関連設定（任意）

サブエージェントの並列数などは `~/.codex/config.toml` の `[agents]` で調整する:

```toml
[agents]
enabled = true                          # 既定 true。false でマルチエージェントを無効化
max_concurrent_threads_per_session = 8  # 同時に開ける spawn 済みスレッド数の上限
```

一時的にこのスキルだけ無効化したいときは `[[skills.config]]` を使う（**有効化用ではなく無効化用**）:

```toml
[[skills.config]]
path = "/Users/<you>/.agents/skills/html-visual-explainer/SKILL.md"
enabled = false
```

`~/.codex/config.toml` を変更したら Codex を再起動すること。

## 出力

- ユーザーが今いるディレクトリの `docs/` に `<トピック>-kaisetsu.html` として保存される（`docs/` が無ければ作る）
- 外部依存は Google Fonts のみ。ダブルクリックでそのまま読める
- macOS なら `open docs/<ファイル>.html` で表示

## 編集するとき

- **手順を変える** → `SKILL.md`
- **説明順序・文体のルール** → `references/structure-guide.md`
- **図の選び方・作法** → `references/svg-guide.md`
- **配色・装飾パーツ** → `references/design-system.md`
- **HTMLの下地（CSS・目次スクリプト）** → `assets/template.html`
- **図の部品を足す** → `assets/svgs/` に `.svg` を追加し、`assets/svgs/svg-catalog.html` にも並べる

Claude Code 用と Codex 用でルールを二重管理しないよう、
**核となる手順は `SKILL.md` と `references/` に置き**、`agents/` 配下は「そこを読め」と指示する薄い層に保つ。

SVG部品を見比べたいときはカタログをブラウザで開く:

```bash
open assets/svgs/svg-catalog.html
```

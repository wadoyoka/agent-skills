# agent-skills

Claude Code と Codex で共用するエージェントスキルの置き場。

スキルの実体はこのリポジトリで管理し、`setup.sh` が `~/.claude/` `~/.agents/` `~/.codex/` へ
シンボリックリンクを張って接続する。**ホーム配下にコピーを散らかさない**のが方針。

`SKILL.md` は Claude Code と Codex が**同じ形式で読む**（`name` / `description` の frontmatter が必須）ので、
スキル本体は 1 つで足りる。ハーネス固有なのはサブエージェント定義だけ。

## 収録スキル

| スキル | 概要 |
|--------|------|
| [html-visual-explainer](skills/html-visual-explainer/) | 質問に対して、インラインSVGの図解つき・日本語・単一ファイルの HTML 解説ページ（グラレコ風）を1枚生成する |
| [explainer-video](skills/explainer-video/) | ナレーション（VOICEVOX）と字幕つきの動画（MP4）を、依頼ごとに聞き手・目的に合わせて設計してコードで作る。Remotion の規約に当たる場合は HTML/CSS/JS で作る |

## セットアップ

```bash
git clone <this-repo> ~/github-projects/github.com/wadoyoka/agent-skills
cd ~/github-projects/github.com/wadoyoka/agent-skills
./setup.sh
```

| コマンド | 動作 |
|----------|------|
| `./setup.sh` | 全スキルを Claude Code / Codex に接続 |
| `./setup.sh --dry-run` | 変更せず、実行される内容だけ表示 |
| `./setup.sh --claude-only` | Claude Code だけ |
| `./setup.sh --with-codex` | Codex 未導入でも配置 |
| `./setup.sh --uninstall` | このリポジトリを指すリンクを取り外す |
| `./setup.sh <スキル名>` | 対象スキルだけ処理（オプションと併用可） |

リポジトリはどこに置いてもよい（スクリプトが自分の位置からパスを解決する）。
接続はすべてシンボリックリンクなので、**リポジトリ側を編集すれば即座に反映される**。

既存の実体ファイル／ディレクトリがある場合は `~/.agent-skills-backups/` に
`<出所>--<名前>.bak.<日時>` として退避してから張り替える。
（`~/.claude/skills/` や `~/.agents/skills/` の中に残すと、`.bak` ディレクトリまで
重複スキルとして読み込まれるため、外へ逃がしている。）

## セキュリティスキャン（開発用）

開発用の道具は [mise](https://mise.jdx.dev/) で入れる（`.mise.toml`）。スキルを使うだけなら要らない。

```bash
mise trust && mise install   # 初回だけ（trivy を入れる）
mise run scan                # 依存の脆弱性と秘密情報の書き込みを調べる（見つかったら失敗）
mise run scan:voicevox       # explainer-video が使う VOICEVOX エンジンのイメージを調べる（報告だけ）
```

`scan:voicevox` は他者が作ったイメージを調べるもので、見つかった項目はこのリポジトリでは直せない。
更新されたイメージに替えるかどうかの判断材料に使う。

## ディレクトリ構成

```
./
├── setup.sh                  全スキル一括セットアップ（各 skills/*/scripts/setup.sh を呼ぶ）
├── .mise.toml                開発用の道具（trivy）とスキャンのタスク
├── README.md
└── skills/
    └── html-visual-explainer/
        ├── SKILL.md          スキル本体（Claude Code / Codex 共通）
        ├── README.md
        ├── agents/
        │   ├── claude/<name>.md     Claude Code サブエージェント（YAML frontmatter）
        │   └── codex/<name>.toml    Codex サブエージェント（TOML）
        ├── scripts/setup.sh  このスキルの接続スクリプト
        ├── assets/           テンプレートHTML・SVG部品
        └── references/       構成・図・デザインのリファレンス
```

## ハーネスごとの対応状況

| | Claude Code | Codex |
|---|---|---|
| スキルの設置先 | `~/.claude/skills/<name>` | `~/.agents/skills/<name>` |
| スキルの形式 | `SKILL.md`（frontmatter: `name` / `description`） | 同じ |
| サブエージェントの設置先 | `~/.claude/agents/<name>.md` | `~/.codex/agents/<name>.toml` |
| サブエージェントの形式 | Markdown + YAML frontmatter | **TOML**（`name` / `description` / `developer_instructions` が必須） |
| 呼び出し | 自動発火 / `/<name>` / エージェント名で委譲 | 自動発火 / TOML の `name` で委譲 |
| 全体設定 | `~/.claude/settings.json` | `~/.codex/config.toml` の `[agents]` |

### Codex 側の要点

- スキルの探索パスは `$CWD/.agents/skills` → `$REPO_ROOT/.agents/skills` → `$HOME/.agents/skills`。
  **リンクを張るだけで発火する**（`config.toml` への登録は不要）。
- `[[skills.config]]` は**無効化用**の上書き（`path` に `SKILL.md` の絶対パス、`enabled = false`）。
- サブエージェントは TOML。Codex はファイル名ではなく**`name` フィールド**で識別する。
  `model` / `model_reasoning_effort` を書かなければ、spawn 時の値 → `[agents]` の既定 → 親セッションの値、の順で解決される。
- `~/.codex/config.toml` を変更したら Codex を再起動すること。

## スキルを追加するには

1. `skills/<name>/` を作り、`SKILL.md`（`name` と `description` の frontmatter 必須）を置く
2. `agents/claude/<name>.md` に Claude Code のサブエージェント定義、
   `agents/codex/<name>.toml` に Codex のサブエージェント定義を置く
3. `skills/<name>/scripts/setup.sh` を既存スキルからコピーする
   （スクリプトは自分の位置からスキル名・パスを解決するので、そのままで動く）
4. `./setup.sh <name>` で接続

## 出典

Codex 側の仕様は公式ドキュメントに基づく:

- [Subagents — ChatGPT Learn](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Build skills — OpenAI Developers](https://developers.openai.com/codex/skills)
- [Configuration Reference — OpenAI Developers](https://developers.openai.com/codex/config-reference)

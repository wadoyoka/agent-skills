# 規約の確認（Remotion・VOICEVOX・OS の読み上げ音声）

動画は人に見せるものなので、使う道具と声の規約を、作る前に確かめる。
ここに書いてあるのは書いた時点の要約。**最終的には、入れた版の規約そのものを読んで確かめる。**

## Remotion

### 誰が無料で使えるか（4.x の LICENSE.md）

> You are eligible to use Remotion for free if you are:
> - an individual
> - a for-profit organization with up to 3 employees
> - a non-profit or not-for-profit organization
> - evaluating whether Remotion is a good fit, and are not yet using it in a commercial way

無料の範囲なら、商用の動画を作ってもよい（"non-commercially or commercially for the purpose of creating videos and images"）。
上に当てはまらない営利企業（社員 4 人以上）は Company License が要る（remotion.pro で購入）。

### 判断のしかた

- 判定は**動画を作る側**の立場で決まる。見る人（取引先の企業など）が誰かは関係ない。
- 個人開発・個人の仕事 → 個人として無料。
- 大学・研究室・NPO → 非営利として無料。
- 会社の仕事として作る → 会社の社員数と、Company License の有無で決まる。
- 分からないときは HTML 版にする。HTML 版は Remotion を一切使わないので、この判断が要らない。

### 版による変更

LICENSE.md の冒頭に「Remotion 5.0 で規約が少し変わる」と告知がある。
Remotion を入れたら `movie/node_modules/remotion/LICENSE.md` を読み、上の要約と違っていれば、
その内容でユーザーに確かめ直す。境目のケースは https://www.remotion.pro/faq を案内する。

## VOICEVOX

- エンジン自体は無料で使えるが、**声（話者）ごとに利用規約が違う**。
- 規約は `node voicevox-speakers.mjs --policies`（全員の冒頭）と
  `node voicevox-speakers.mjs <話者名>`（1 人の全文）で読める。エンジンの `/speaker_info` が返す `policy` そのもの。
- よく見る型:
  - 「クレジットを書けば商用・非商用で利用可」→ 用途を問わず使いやすい
  - 「非商用のみ。商用は事前確認」→ 営利の用途では選ばない
  - 「個人なら商用可。企業が関わる場合は事前確認」→ 会社の仕事や、企業が関わる発表では選ばない
- どの型でも、**クレジット表記（例: `VOICEVOX:話者名`）が条件**になっていることが多い。
  `narration.json` の `credit` に入れると、テンプレートが最初と最後のシーンに表示する。
  動画を配るときの説明文にも同じ表記を書くよう、ユーザーに伝える。
- 規約の URL が `policy` に書かれていることが多い。詳細が要るときはそれを案内する。

## OS 付属の読み上げ音声（使わない）

macOS の使用許諾（`/Library/Documentation/License.lpdf`）には、システムの声について次のようにある。

> use the system voices included in the Apple Software ("System Voices") (1) while running the Apple Software
> and (2) to create your own original content and projects for your personal, non-commercial use; ...
> No other creation or use of the System Voices ... is permitted by this License, including but not limited to
> the use, reproduction, display, performance, recording, publishing or redistribution of any of the System Voices
> in a profit, non-profit, public sharing or commercial context.

非営利の場でも、人に見せる・配る使い方は対象外と読める。`say` などの OS の声は、
自分だけで確かめる下書きを除いて使わない。ほかの OS の声にも似た制限がありうるので、同じ扱いにする。

## そのほか

- スクリーンショット: ユーザー自身のアプリの画面なら問題になりにくい。他社のサービスやロゴが大きく写るときは、
  そのまま見せてよいかユーザーに確かめる。
- 見本データ: Storybook などの見本データ（仮の URL・パス・名前）が写る。実在の個人情報が写っていないかを確かめる。

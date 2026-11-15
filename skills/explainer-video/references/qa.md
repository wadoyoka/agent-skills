# 確認の手順

## 書き出す前: 静止画で配置を確かめる

```bash
node stills.mjs                 # Remotion 版
node render.mjs --stills        # HTML 版
bash contact-sheet.sh out/sheet out/stills/*.png
```

コンタクトシートを開いて、次を見る。直したら、そのシーンだけ撮り直す（シーン ID を渡す）。

- 文字や要素が枠からはみ出していないか
- 変なところで折り返していないか（1 文字だけ次の行に落ちる、ファイル名が途中で切れる）
- 要素が字幕（下 200px）や見出しに重なっていないか
- スクリーンショットの強調枠が、狙った部品に乗っているか（`--every-line` で途中のフレームも出す）
- 何も出ていない時間が長いシーンがないか（最初の文で何も出さないと、見出しだけの画面が続く）
- 設計メモ（`brief.md`）の聞き手に合っているか: 1 画面の文字が多すぎないか、言い換えるはずの専門用語が残っていないか、
  文字の大きさが流す場面（教室・会議室・各自の画面）で読めるか

## 書き出したあと

```bash
F=out/video.mp4
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height -of compact "$F"   # 映像と音声の両方があるか・長さ
ffmpeg -hide_banner -i "$F" -af silencedetect=noise=-45dB:d=4 -vn -f null - 2>&1 | grep -c silence_start   # 4 秒以上の無音の数（0 が望ましい）
ffmpeg -hide_banner -i "$F" -af volumedetect -vn -f null - 2>&1 | grep -E 'mean_volume|max_volume'          # 音量
```

### 音量をそろえる（Remotion 版）

Remotion の出力は小さめなので、映像はそのままに音声だけ -16 LUFS にそろえる（HTML 版は `render.mjs` が済ませている）。

```bash
ffmpeg -v error -y -i out/video.mp4 -c:v copy -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -movflags +faststart out/<名前>.mp4
```

### 何か所か映像を見る

```bash
for t in 10 120 300; do ffmpeg -v error -y -ss $t -i out/<名前>.mp4 -frames:v 1 out/check_$t.png; done
```

## 報告に入れること

- 置き場所・長さ・解像度・サイズ
- 設計メモの要点（聞き手・ゴール・型）と、推定で決めたこと
- 確かめたこと（映像と音声がある・長い無音がない・音量をそろえた・静止画で配置を見た）
- 確かめていないこと（音声を実際には聞いていない、など）
- 描画方法と規約上の根拠、話者とクレジット
- 写っている見本データなど、流す前に知っておくべきこと
- 直し方（`brief.md`・`narration.json` → `node gen-audio.mjs` → 書き出し直し）

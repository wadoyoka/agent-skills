// 動画全体の組み立て。シーンを順に並べ、ナレーション・字幕・進み具合のバー・クレジットを重ねる。
// シーンの中身は scenes.tsx に書く。ここは原則として触らなくてよい。
import React from "react";
import { AbsoluteFill, Html5Audio, Sequence, Series, interpolate, staticFile, useCurrentFrame } from "remotion";
import narration from "../narration.json";
import timing from "../timing.json";
import { FONT, Frame, SceneMeta, SceneProvider, SceneTiming, THEMES, useScene } from "./kit";
import { SCENES } from "./scenes";

const scenes = timing.scenes as SceneTiming[];
const metas = narration.scenes as SceneMeta[];
const credit: string | undefined = (narration as { credit?: string }).credit;
const starts = scenes.reduce<number[]>((acc, _s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + scenes[i - 1].duration], []);
const themeOf = (id: string) => THEMES[metas.find((m) => m.id === id)?.theme ?? "light"];
const FADE = 8;
const SUB_GAP = 9;

/** scenes.tsx にまだ無いシーンの仮表示。書き途中でも全体を通して確かめられるようにする。 */
const Placeholder: React.FC = () => {
  const { timing: t, theme } = useScene();
  return (
    <Frame>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 160 }}>
        <div style={{ fontSize: 40, color: theme.sub }}>scenes.tsx に「{t.id}」を足してください</div>
      </AbsoluteFill>
    </Frame>
  );
};

const Fade: React.FC<{ duration: number; bg: string; children: React.ReactNode }> = ({ duration, bg, children }) => {
  const frame = useCurrentFrame();
  const o = Math.min(
    interpolate(frame, [0, FADE], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(frame, [duration - FADE, duration], [1, 0], { extrapolateLeft: "clamp" }),
  );
  return (
    <AbsoluteFill style={{ background: bg }}>
      <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

const sceneIndexAt = (frame: number) => {
  let idx = 0;
  for (let i = 0; i < scenes.length; i++) if (frame >= starts[i]) idx = i;
  return idx;
};

/** いま読んでいる文を、画面の下に出す。 */
const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const idx = sceneIndexAt(frame);
  const local = frame - starts[idx];
  const line = scenes[idx].lines.find((l) => local >= l.start && local < l.start + l.frames + SUB_GAP);
  if (!line) return null;
  const o = interpolate(local, [line.start, line.start + 4], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 46 }}>
      <div
        style={{
          maxWidth: 1640,
          background: "rgba(12,14,22,0.82)",
          color: "#fff",
          fontFamily: FONT,
          fontSize: 35,
          fontWeight: 600,
          lineHeight: 1.5,
          padding: "14px 32px",
          borderRadius: 14,
          textAlign: "center",
          opacity: o,
        }}
      >
        {line.sub}
      </div>
    </AbsoluteFill>
  );
};

/** 下端の進み具合。章（part）の切れ目に印を付ける。 */
const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  const total = timing.total;
  const idx = sceneIndexAt(frame);
  // 章名のあるシーンどうしで、章名が変わったところだけ
  const marks: number[] = [];
  let prev: string | undefined;
  scenes.forEach((s, i) => {
    const part = metas.find((m) => m.id === s.id)?.part;
    if (!part) return;
    if (prev && part !== prev) marks.push((starts[i] / total) * 100);
    prev = part;
  });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end" }}>
      <div style={{ position: "relative", height: 8, background: "rgba(128,128,128,0.18)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(frame / total) * 100}%`, background: themeOf(scenes[idx].id).accent }} />
        {marks.map((m) => (
          <div key={m} style={{ position: "absolute", left: `${m}%`, top: -4, width: 3, height: 16, background: "rgba(128,128,128,0.6)" }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** 話者のクレジット（VOICEVOX の規約で表記が必要）。最初と最後のシーンの右上に出す。 */
const Credit: React.FC = () => {
  const frame = useCurrentFrame();
  const idx = sceneIndexAt(frame);
  if (!credit || (idx !== 0 && idx !== scenes.length - 1)) return null;
  const t = themeOf(scenes[idx].id);
  return <div style={{ position: "absolute", right: 64, top: 52, fontFamily: FONT, fontSize: 22, color: t.sub }}>音声：{credit}</div>;
};

export const Video: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Series>
      {scenes.map((s) => {
        const meta = metas.find((m) => m.id === s.id) ?? { id: s.id };
        const theme = THEMES[meta.theme ?? "light"];
        const C = SCENES[s.id] ?? Placeholder;
        return (
          <Series.Sequence key={s.id} durationInFrames={s.duration} name={s.id}>
            <SceneProvider value={{ theme, timing: s, meta }}>
              <Fade duration={s.duration} bg={theme.bg}>
                <C />
              </Fade>
            </SceneProvider>
          </Series.Sequence>
        );
      })}
    </Series>
    {scenes.flatMap((s, i) =>
      s.lines.map((l) => (
        <Sequence key={l.file} from={starts[i] + l.start} durationInFrames={l.frames + 2} name={l.file}>
          <Html5Audio src={staticFile(l.file)} />
        </Sequence>
      )),
    )}
    <Subtitles />
    <Progress />
    <Credit />
  </AbsoluteFill>
);

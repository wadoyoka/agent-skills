// シーンの中身。narration.json の scenes[].id と同じ名前で SCENES に登録する。
//
// 書き方の型:
//   const cue = useCue();                 // cue(i) = i 文目が始まるフレーム、cue(i, 10) = その 10 フレーム後
//   <Reveal at={cue(1)}>…</Reveal>         // 1 文目に合わせて出す
//   const on = useActive(cue(1), cue(2));  // 1 文目のあいだだけ 1（Card の glow や Highlight の on に渡す）
//
// スクリーンショットに枠を重ねる例（元画像の CSS 幅が 512px、表示幅 700px のとき k = 700 / 512）:
//   <Shot src="dialog.png" width={700}>
//     <Highlight x={128 * k} y={223 * k} w={256 * k} h={42 * k} on={useActive(cue(2), cue(3))} />
//   </Shot>
//
// 下の 4 つは assets/narration.example.json 用の見本。実際の動画では書き換える。
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Arrow, Card, Code, Frame, Icon, IconBadge, MONO, Pill, Reveal, Scene, useActive, useCue, useSpring, useTheme } from "./kit";

const TitleScene: React.FC = () => {
  const t = useTheme();
  const cue = useCue();
  const a = useSpring(4, 20);
  return (
    <Frame>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 120 }}>
        <div style={{ opacity: a, transform: `translateY(${(1 - a) * 20}px)`, display: "flex", alignItems: "center", gap: 18 }}>
          <IconBadge name="film" size={64} />
          <span style={{ fontSize: 40, fontWeight: 700 }}>見本</span>
        </div>
        <Reveal at={14}>
          <div style={{ fontSize: 96, fontWeight: 800, marginTop: 30 }}>解説動画テンプレート</div>
        </Reveal>
        <Reveal at={cue(0, 20)}>
          <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
            <Pill size={30}>1　作り方</Pill>
            <Pill size={30} color="#fff" bg={t.code}>
              2　しくみ
            </Pill>
          </div>
        </Reveal>
      </AbsoluteFill>
    </Frame>
  );
};

const PointsScene: React.FC = () => {
  const t = useTheme();
  const cue = useCue();
  const items = [
    { icon: "pen", title: "原稿を書く", body: "字幕の表記と、読み上げ用の読み" },
    { icon: "mic", title: "音声を作る", body: "VOICEVOX で 1 文ずつ" },
    { icon: "film", title: "シーンを書く", body: "文に合わせて要素を出す" },
  ];
  return (
    <Scene title="作り方は 3 ステップ">
      <div style={{ display: "flex", gap: 30, marginTop: 40 }}>
        {items.map((it, i) => (
          <Reveal key={it.title} at={cue(1, i * 10)} scale style={{ flex: 1 }}>
            <Card style={{ height: 320 }} glow={useActive(cue(1, i * 10), cue(2))}>
              <IconBadge name={it.icon} size={84} />
              <div style={{ fontSize: 40, fontWeight: 800, marginTop: 24 }}>
                <span style={{ fontFamily: MONO, color: t.accent, marginRight: 14 }}>{i + 1}</span>
                {it.title}
              </div>
              <div style={{ fontSize: 26, color: t.sub, marginTop: 12 }}>{it.body}</div>
            </Card>
          </Reveal>
        ))}
      </div>
      <Reveal at={cue(2)}>
        <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 14, fontSize: 32, fontWeight: 700, color: t.accent2 }}>
          <Icon name="check" size={40} color={t.accent2} stroke={3} />
          画面はナレーションの文に合わせて動く
        </div>
      </Reveal>
    </Scene>
  );
};

const FlowScene: React.FC = () => {
  const t = useTheme();
  const cue = useCue();
  const frame = useCurrentFrame();
  const grow = (at: number) => interpolate(frame, [at, at + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const nodes = [
    { at: cue(0), icon: "mic", title: "1 文ずつの音声", sub: "public/audio/*.wav" },
    { at: cue(1), icon: "file", title: "開始フレーム", sub: "timing.json" },
    { at: cue(2), icon: "film", title: "シーン", sub: "useCue(i) で合わせる" },
  ];
  return (
    <Scene title="音声と画面の合わせ方">
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 80 }}>
        {nodes.map((n, i) => (
          <React.Fragment key={n.title}>
            <Reveal at={n.at} scale>
              <Card style={{ width: 460, display: "flex", gap: 20, alignItems: "center" }} glow={useActive(n.at, n.at + 60)}>
                <IconBadge name={n.icon} size={72} />
                <div>
                  <div style={{ fontSize: 32, fontWeight: 800 }}>{n.title}</div>
                  <Code size={20} style={{ marginTop: 8, display: "inline-block" }}>
                    {n.sub}
                  </Code>
                </div>
              </Card>
            </Reveal>
            {i < nodes.length - 1 ? <Arrow width={60} color={t.accent} progress={grow(nodes[i + 1].at)} /> : null}
          </React.Fragment>
        ))}
      </div>
    </Scene>
  );
};

const EndScene: React.FC = () => {
  const t = useTheme();
  const p = useSpring(0, 20);
  return (
    <Frame>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 140 }}>
        <div style={{ opacity: p, transform: `scale(${0.94 + 0.06 * p})`, fontSize: 72, fontWeight: 800, color: t.accent }}>おわり</div>
      </AbsoluteFill>
    </Frame>
  );
};

export const SCENES: Record<string, React.FC> = {
  title: TitleScene,
  points: PointsScene,
  flow: FlowScene,
  end: EndScene,
};

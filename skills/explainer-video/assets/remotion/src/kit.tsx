// シーンを組み立てる部品。色・字体・出し方（Reveal）・ナレーションとの合わせ方（useCue）をここに集める。
import React, { createContext, useContext } from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export type Theme = {
  name: "light" | "dark";
  bg: string;
  bg2: string;
  panel: string;
  ink: string;
  sub: string;
  line: string;
  accent: string;
  accent2: string;
  soft: string;
  soft2: string;
  danger: string;
  code: string;
};

/** 1 つ目の配色（明るめ）。動画ごとに、題材・ブランド・流す場面に合わせて色を書き換える。 */
export const light: Theme = {
  name: "light",
  bg: "#F5F1EA",
  bg2: "#EFE9DF",
  panel: "#FFFFFF",
  ink: "#1C1A17",
  sub: "#6E685E",
  line: "#E2DCD0",
  accent: "#D9512C",
  accent2: "#1E7A6A",
  soft: "#FBE3D9",
  soft2: "#D8EEE8",
  danger: "#C62828",
  code: "#1E2230",
};

/** 2 つ目の配色（暗め）。章や話の調子を切り替えるときに使う。色は動画ごとに書き換える。 */
export const dark: Theme = {
  name: "dark",
  bg: "#0D1220",
  bg2: "#111829",
  panel: "#161E31",
  ink: "#E8ECF4",
  sub: "#94A0B8",
  line: "#26314A",
  accent: "#6AA6FF",
  accent2: "#5FD4A6",
  soft: "#1A2A48",
  soft2: "#143329",
  danger: "#FF7A7A",
  code: "#0A0F1B",
};

export const THEMES = { light, dark };

export const FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif';
export const MONO = '"SF Mono", "Menlo", "Consolas", "Noto Sans Mono", monospace';

export type LineTiming = { file: string; start: number; frames: number; sub: string };
export type SceneTiming = { id: string; lines: LineTiming[]; duration: number };
export type SceneMeta = { id: string; theme?: "light" | "dark"; part?: string };

type Ctx = { theme: Theme; timing: SceneTiming; meta: SceneMeta };
const SceneCtx = createContext<Ctx | null>(null);
export const SceneProvider = SceneCtx.Provider;
export const useScene = () => {
  const c = useContext(SceneCtx);
  if (!c) throw new Error("SceneProvider の外で使われています");
  return c;
};
export const useTheme = () => useScene().theme;

/**
 * i 文目のナレーションが始まるフレーム（シーンの頭からの数）を返す関数。
 * 文が無い番号なら、最後の文の終わり。画面の要素はこれに合わせて出す。
 */
export const useCue = () => {
  const { timing } = useScene();
  return (i: number, offset = 0) => {
    const line = timing.lines[i];
    if (line) return line.start + offset;
    const last = timing.lines[timing.lines.length - 1];
    return last.start + last.frames + offset;
  };
};

/** at のフレームから dur フレームかけて 0 → 1 になる値。 */
export const useSpring = (at: number, dur = 16) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping: 200 }, durationInFrames: dur });
};

/** start から end のあいだだけ 1 になる値（強調・光らせる用）。 */
export const useActive = (start: number, end = Infinity, ramp = 8) => {
  const frame = useCurrentFrame();
  const on = interpolate(frame, [start, start + ramp], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const off = end === Infinity ? 1 : interpolate(frame, [end, end + ramp], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return Math.min(on, off);
};

/** at のフレームでふわっと出す。dx・dy で出てくる向き、scale で少し拡大しながら。 */
export const Reveal: React.FC<{
  at: number;
  dy?: number;
  dx?: number;
  scale?: boolean;
  dur?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, dy = 26, dx = 0, scale = false, dur = 16, style, children }) => {
  const p = useSpring(at, dur);
  const s = scale ? 0.92 + 0.08 * p : 1;
  return <div style={{ opacity: p, transform: `translate(${(1 - p) * dx}px, ${(1 - p) * dy}px) scale(${s})`, ...style }}>{children}</div>;
};

/** シーンの背景。 */
export const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useTheme();
  return (
    <AbsoluteFill
      style={{
        background:
          t.name === "light"
            ? `radial-gradient(1200px 700px at 85% -10%, ${t.soft} 0%, transparent 60%), radial-gradient(900px 600px at -10% 110%, ${t.soft2} 0%, transparent 55%), ${t.bg}`
            : `radial-gradient(1100px 700px at 90% -20%, #1B2C55 0%, transparent 60%), radial-gradient(900px 600px at -10% 120%, #0F3A2E 0%, transparent 55%), ${t.bg}`,
        color: t.ink,
        fontFamily: FONT,
      }}
    >
      {t.name === "dark" ? (
        <AbsoluteFill
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 80%)",
          }}
        />
      ) : null}
      {children}
    </AbsoluteFill>
  );
};

/**
 * 見出しつきのふつうのシーン。章名（narration.json の part）と見出しを上に出し、
 * 中身は上 230px〜下 200px の範囲（幅 1680px）に置く。下 200px は字幕のために空けておく。
 */
export const Scene: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const t = useTheme();
  const { meta } = useScene();
  const p = useSpring(0, 18);
  return (
    <Frame>
      <div style={{ position: "absolute", left: 120, top: 64, opacity: p, transform: `translateY(${(1 - p) * -14}px)` }}>
        {meta.part ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, fontSize: 24, fontWeight: 600, color: t.accent, letterSpacing: "0.06em" }}>
            <span style={{ width: 28, height: 4, borderRadius: 2, background: t.accent }} />
            {meta.part}
          </div>
        ) : null}
        <div style={{ fontSize: 60, fontWeight: 800, marginTop: 10, letterSpacing: "0.01em" }}>{title}</div>
      </div>
      <AbsoluteFill style={{ top: 230, bottom: 200, left: 120, right: 120, width: "auto", height: "auto" }}>{children}</AbsoluteFill>
    </Frame>
  );
};

/** 角丸のカード。glow（0〜1）で枠を強調色にする。 */
export const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode; glow?: number }> = ({ style, children, glow = 0 }) => {
  const t = useTheme();
  return (
    <div
      style={{
        background: t.panel,
        border: `2px solid ${glow > 0 ? mix(t.line, t.accent, glow) : t.line}`,
        borderRadius: 24,
        padding: 32,
        boxShadow: t.name === "light" ? `0 10px 30px rgba(60,40,20,${0.08 + glow * 0.08})` : `0 10px 30px rgba(0,0,0,${0.3 + glow * 0.2})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Pill: React.FC<{ color?: string; bg?: string; children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({
  color,
  bg,
  children,
  size = 22,
  style,
}) => {
  const t = useTheme();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: `${size * 0.3}px ${size * 0.75}px`,
        borderRadius: 999,
        fontSize: size,
        fontWeight: 600,
        color: color ?? t.accent,
        background: bg ?? t.soft,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/** 文中のコード（ファイル名・関数名など）。折り返さない。 */
export const Code: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 24, style }) => {
  const t = useTheme();
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: size,
        padding: "2px 10px",
        borderRadius: 8,
        background: t.name === "dark" ? "rgba(106,166,255,0.12)" : "rgba(30,34,48,0.07)",
        color: t.name === "dark" ? "#BFD6FF" : t.code,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/** 複数行のコード。色を付けたいところは <span style={{ color }}> で包む。 */
export const CodeBlock: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 21, style }) => {
  const t = useTheme();
  return (
    <pre
      style={{
        margin: 0,
        fontFamily: MONO,
        fontSize: size,
        lineHeight: 1.55,
        background: t.code,
        border: `1px solid ${t.line}`,
        borderRadius: 16,
        padding: "18px 22px",
        color: "#D6E2FF",
        whiteSpace: "pre",
        ...style,
      }}
    >
      {children}
    </pre>
  );
};

/**
 * public/shots/ のスクリーンショットを角丸の枠で出す。
 * 中に置いた <Highlight> は、元画像の CSS ピクセル座標 × (width / 元の CSS 幅) で位置を合わせる。
 */
export const Shot: React.FC<{ src: string; width: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ src, width, style, children }) => (
  <div
    style={{
      position: "relative",
      width,
      borderRadius: 18,
      overflow: "hidden",
      background: "#fff",
      boxShadow: "0 24px 60px rgba(30,20,10,0.22), 0 0 0 1px rgba(0,0,0,0.06)",
      ...style,
    }}
  >
    <Img src={staticFile(`shots/${src}`)} style={{ width: "100%", display: "block" }} />
    {children}
  </div>
);

/** スクリーンショットの上に重ねる強調枠。on（0〜1）で出し入れする。 */
export const Highlight: React.FC<{ x: number; y: number; w: number; h: number; on: number; color?: string }> = ({ x, y, w, h, on, color }) => {
  const t = useTheme();
  const c = color ?? t.accent;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 12,
        border: `5px solid ${c}`,
        opacity: on,
        boxShadow: `0 0 0 ${8 * on}px ${mix(t.bg, c, 0.25)}`,
      }}
    />
  );
};

/** 横向きの矢印。progress（0〜1）で左から伸びる。 */
export const Arrow: React.FC<{ width: number; color: string; progress?: number; thickness?: number; dashed?: boolean }> = ({
  width,
  color,
  progress = 1,
  thickness = 5,
  dashed = false,
}) => {
  const w = Math.max(0, width * progress);
  return (
    <svg width={width} height={30} style={{ overflow: "visible", flexShrink: 0 }}>
      <line x1={0} y1={15} x2={Math.max(0, w - 12)} y2={15} stroke={color} strokeWidth={thickness} strokeLinecap="round" strokeDasharray={dashed ? "10 10" : undefined} />
      {progress > 0.05 ? (
        <path d={`M${w - 16} 5 L${w} 15 L${w - 16} 25`} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
    </svg>
  );
};

/** 2 色を k（0〜1）の割合で混ぜる。#RRGGBB だけ受け付ける。 */
export const mix = (a: string, b: string, k: number) => {
  const pa = hex(a);
  const pb = hex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
const hex = (h: string) => {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};

/** 線画アイコン（24×24 の viewBox）。足りなければここに足す。 */
const ICONS: Record<string, React.ReactNode> = {
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </>
  ),
  folder: <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />,
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </>
  ),
  alert: (
    <>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  monitor: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </>
  ),
  cpu: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
  power: (
    <>
      <path d="M12 2v10" />
      <path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
    </>
  ),
  pointer: <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />,
  wrench: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  book: <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </>
  ),
  git: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="9" r="3" />
      <path d="M6 9v6" />
      <path d="M18 12c0 4-6 3-9 6" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <path d="M12 18v4" />
    </>
  ),
  film: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="2.18" />
      <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" />
    </>
  ),
  pen: <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />,
};

export const Icon: React.FC<{ name: string; size?: number; color?: string; stroke?: number }> = ({ name, size = 40, color = "currentColor", stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {ICONS[name]}
  </svg>
);

/** アイコンを角丸の下地に乗せたもの。 */
export const IconBadge: React.FC<{ name: string; size?: number; color?: string; bg?: string }> = ({ name, size = 72, color, bg }) => {
  const t = useTheme();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: bg ?? t.soft,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon name={name} size={size * 0.52} color={color ?? t.accent} stroke={2.2} />
    </div>
  );
};

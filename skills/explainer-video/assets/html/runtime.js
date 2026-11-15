// 指定したフレームの見た目を、DOM に直接描く小さな仕組み。
// 書き出し（render.mjs）は renderFrame(n) を呼んでから 1 枚撮る、を繰り返す。
// CSS の transition / animation は使わない（撮るときに途中の状態がずれるため）。動きはすべてここで計算する。
//
// HTML に書ける指定（n は文番号。「2+10」は 2 文目の 10 フレーム後、「end」は最後の文の終わり）:
//   data-at="n"            n 文目に合わせて出す
//   data-anim="up|down|left|right|scale|fade"   出方（既定は up）
//   data-active="n~m"      n 文目から m 文目の手前まで、CSS 変数 --on を 0→1 にする（m を省くとシーンの終わりまで）
//   data-grow="n"          n 文目から 14 フレームかけて、CSS 変数 --p を 0→1 にする（矢印など）
//   data-count="0..128"    data-at から 30 フレームで数を数え上げる（data-dur で長さを変えられる）
//   data-part              narration.json の part（章名）を入れる
//
// シーン固有の動きは window.sceneHooks["シーンID"] = (local, api) => { ... } で書ける。
//   api.cue(n, offset) / api.progress(at, dur) / api.active(start, end) / api.el（そのシーンの要素）
(() => {
  const FADE = 8;
  const SUB_GAP = 9;
  const REVEAL = 16;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);

  let timing;
  let narration;
  const scenes = [];
  window.sceneHooks = window.sceneHooks || {};

  const cueOf = (scene, spec) => {
    const m = String(spec).trim().match(/^(\d+|end)(?:\+(\d+))?$/);
    if (!m) throw new Error(`読めない指定です: "${spec}"`);
    const lines = scene.timing.lines;
    const last = lines[lines.length - 1];
    const base = m[1] === "end" || !lines[Number(m[1])] ? last.start + last.frames : lines[Number(m[1])].start;
    return base + Number(m[2] || 0);
  };

  const ANIMS = {
    up: (p) => `translateY(${(1 - p) * 26}px)`,
    down: (p) => `translateY(${(p - 1) * 26}px)`,
    left: (p) => `translateX(${(1 - p) * -30}px)`,
    right: (p) => `translateX(${(1 - p) * 30}px)`,
    scale: (p) => `scale(${0.92 + 0.08 * p})`,
    fade: () => "none",
  };

  const apiFor = (scene, local) => ({
    el: scene.el,
    cue: (i, offset = 0) => cueOf(scene, i) + offset,
    progress: (at, dur = REVEAL) => easeOut((local - at) / dur),
    active: (start, end = Infinity) => Math.min(clamp((local - start) / 8), end === Infinity ? 1 : clamp((end + 8 - local) / 8)),
  });

  window.renderFrame = (frame) => {
    let idx = 0;
    for (let i = 0; i < scenes.length; i++) if (frame >= scenes[i].start) idx = i;
    const scene = scenes[idx];
    const local = frame - scene.start;
    scenes.forEach((s, i) => (s.el.style.display = i === idx ? "block" : "none"));

    scene.inner.style.opacity = Math.min(clamp(local / FADE), clamp((scene.duration - local) / FADE));

    for (const el of scene.el.querySelectorAll("[data-at]")) {
      const p = easeOut((local - cueOf(scene, el.dataset.at)) / REVEAL);
      el.style.opacity = p;
      el.style.transform = (ANIMS[el.dataset.anim] || ANIMS.up)(p);
    }
    for (const el of scene.el.querySelectorAll("[data-active]")) {
      const [a, b] = el.dataset.active.split("~");
      const start = cueOf(scene, a);
      const end = b ? cueOf(scene, b) : Infinity;
      const on = Math.min(clamp((local - start) / 8), end === Infinity ? 1 : clamp((end + 8 - local) / 8));
      el.style.setProperty("--on", on);
    }
    for (const el of scene.el.querySelectorAll("[data-grow]")) {
      el.style.setProperty("--p", easeOut((local - cueOf(scene, el.dataset.grow)) / 14));
    }
    for (const el of scene.el.querySelectorAll("[data-count]")) {
      const [from, to] = el.dataset.count.split("..").map(Number);
      const at = el.dataset.at ? cueOf(scene, el.dataset.at) : 0;
      const p = easeOut((local - at) / Number(el.dataset.dur || 30));
      el.textContent = Math.round(from + (to - from) * p).toLocaleString("en-US");
    }
    const hook = window.sceneHooks[scene.id];
    if (hook) hook(local, apiFor(scene, local));

    const line = scene.timing.lines.find((l) => local >= l.start && local < l.start + l.frames + SUB_GAP);
    const sub = document.getElementById("subtitle");
    sub.textContent = line ? line.sub : "";
    sub.style.opacity = line ? clamp((local - line.start) / 4) : 0;

    const stage = document.getElementById("stage");
    stage.dataset.theme = scene.theme;
    stage.querySelector("#progress .fill").style.width = `${(frame / timing.total) * 100}%`;
    document.getElementById("credit").style.display = idx === 0 || idx === scenes.length - 1 ? "block" : "none";
  };

  const init = async () => {
    [timing, narration] = await Promise.all([fetch("timing.json").then((r) => r.json()), fetch("narration.json").then((r) => r.json())]);
    let start = 0;
    for (const t of timing.scenes) {
      const el = document.querySelector(`[data-scene="${t.id}"]`);
      if (!el) throw new Error(`index.html に data-scene="${t.id}" がありません`);
      const meta = narration.scenes.find((s) => s.id === t.id) || {};
      const theme = meta.theme || "light";
      el.dataset.theme = theme;
      for (const p of el.querySelectorAll("[data-part]")) p.textContent = meta.part || "";
      const inner = document.createElement("div");
      inner.className = "inner";
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(inner);
      scenes.push({ id: t.id, el, inner, start, duration: t.duration, timing: t, theme, part: meta.part });
      start += t.duration;
    }
    const progress = document.getElementById("progress");
    // 章名のあるシーンどうしで、章名が変わったところだけ印を付ける
    let prevPart;
    scenes.forEach((s) => {
      if (!s.part) return;
      const changed = prevPart && s.part !== prevPart;
      prevPart = s.part;
      if (changed) {
        const m = document.createElement("div");
        m.className = "mark";
        m.style.left = `${(s.start / timing.total) * 100}%`;
        progress.appendChild(m);
      }
    });
    document.getElementById("credit").textContent = narration.credit ? `音声：${narration.credit}` : "";
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    await document.fonts.ready;
    window.__timing = timing;
    window.renderFrame(0);
    window.__ready = true;
    if (!new URLSearchParams(location.search).has("render")) preview();
  };

  // ブラウザで開いたときの確認用。再生・停止・好きな位置への移動ができ、ナレーションも鳴る。
  const preview = () => {
    const stage = document.getElementById("stage");
    const fit = () => (stage.style.transform = `scale(${Math.min(innerWidth / 1920, (innerHeight - 48) / 1080)})`);
    addEventListener("resize", fit);
    fit();
    const bar = document.createElement("div");
    bar.id = "controls";
    bar.innerHTML = `<button id="play">再生</button><input id="seek" type="range" min="0" max="${timing.total - 1}" value="0"><span id="time"></span>`;
    document.body.appendChild(bar);
    const seek = bar.querySelector("#seek");
    const time = bar.querySelector("#time");
    const lines = scenes.flatMap((s) => s.timing.lines.map((l) => ({ at: s.start + l.start, file: l.file })));
    const audios = new Map(lines.map((l) => [l.at, new Audio(`public/${l.file}`)]));
    let frame = 0;
    let playing = false;
    let t0 = 0;
    let f0 = 0;
    const show = (f) => {
      frame = Math.max(0, Math.min(timing.total - 1, Math.round(f)));
      window.renderFrame(frame);
      seek.value = frame;
      const sec = frame / timing.fps;
      time.textContent = `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}（${frame}）`;
    };
    const stopAll = () => audios.forEach((a) => a.pause());
    const tick = () => {
      if (!playing) return;
      const prev = frame;
      show(f0 + ((performance.now() - t0) / 1000) * timing.fps);
      for (const l of lines) if (l.at > prev && l.at <= frame) audios.get(l.at).play();
      if (frame >= timing.total - 1) playing = false;
      requestAnimationFrame(tick);
    };
    bar.querySelector("#play").onclick = (e) => {
      playing = !playing;
      e.target.textContent = playing ? "停止" : "再生";
      stopAll();
      if (playing) {
        t0 = performance.now();
        f0 = frame;
        requestAnimationFrame(tick);
      }
    };
    seek.oninput = () => {
      stopAll();
      f0 = Number(seek.value);
      t0 = performance.now();
      show(f0);
    };
    show(0);
  };

  init().catch((e) => {
    window.__error = String(e && e.stack ? e.stack : e);
    console.error(e);
  });
})();

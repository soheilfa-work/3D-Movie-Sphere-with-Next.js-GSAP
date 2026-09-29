"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { MOVIES } from "@/app/movies";

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const FOLLOW = 0.16;

function fibonacciPoint(index: number, count: number) {
  const y = 1 - ((index + 0.5) / count) * 2;
  const ring = Math.sqrt(1 - y * y);
  const theta = GOLDEN_ANGLE * index;
  return {
    x: Math.cos(theta) * ring,
    y,
    z: Math.sin(theta) * ring,
  };
}

type Mat3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

function identity(): Mat3 {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

function multiply(a: Mat3, b: Mat3): Mat3 {
  const out = new Array<number>(9);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      out[row * 3 + col] =
        a[row * 3] * b[col] +
        a[row * 3 + 1] * b[3 + col] +
        a[row * 3 + 2] * b[6 + col];
    }
  }
  return out as Mat3;
}

function rotX(angle: number): Mat3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

function rotY(angle: number): Mat3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

function apply(m: Mat3, x: number, y: number, z: number) {
  return {
    x: m[0] * x + m[1] * y + m[2] * z,
    y: m[3] * x + m[4] * y + m[5] * z,
    z: m[6] * x + m[7] * y + m[8] * z,
  };
}

function orthonormalize(m: Mat3): Mat3 {
  let x0 = m[0],
    x1 = m[1],
    x2 = m[2];
  let y0 = m[3],
    y1 = m[4],
    y2 = m[5];

  let len = Math.hypot(x0, x1, x2) || 1;
  x0 /= len;
  x1 /= len;
  x2 /= len;

  const dot = x0 * y0 + x1 * y1 + x2 * y2;
  y0 -= x0 * dot;
  y1 -= x1 * dot;
  y2 -= x2 * dot;
  len = Math.hypot(y0, y1, y2) || 1;
  y0 /= len;
  y1 /= len;
  y2 /= len;

  const z0 = x1 * y2 - x2 * y1;
  const z1 = x2 * y0 - x0 * y2;
  const z2 = x0 * y1 - x1 * y0;

  return [x0, x1, x2, y0, y1, y2, z0, z1, z2];
}

type SpherePoint = {
  el: HTMLElement;
  x: number;
  y: number;
  z: number;
  hover: number;
};

export default function CardSphere() {
  const stageRef = useRef<HTMLElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const sphere = sphereRef.current;
    const popup = popupRef.current;
    if (!stage || !sphere || !popup) return;

    const kickerEl = popup.querySelector<HTMLElement>("[data-popup-kicker]");
    const titleEl = popup.querySelector<HTMLElement>("[data-popup-title]");
    const copyEl = popup.querySelector<HTMLElement>("[data-popup-copy]");
    const mobileQuery = window.matchMedia("(max-width: 760px)");
    let lastHot = -2;

    const cards = [...sphere.querySelectorAll<HTMLElement>("[data-card]")];
    const points: SpherePoint[] = cards.map((el, index) => ({
      el,
      hover: 0,
      ...fibonacciPoint(index, cards.length),
    }));

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const metrics = { radius: 320, cardW: 180, perspective: 1100 };
    const motion = {
      spread: reducedMotion ? 1 : 0.04,
      dragging: false,
      targetYaw: 0,
      targetPitch: 0,
      currentYaw: 0,
      currentPitch: 0,
      velYaw: 0,
      velPitch: 0,
      lastX: 0,
      lastY: 0,
    };
    const pointer = { x: -9999, y: -9999, over: false };
    let matrix = identity();

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      motion.dragging = true;
      motion.velYaw = 0;
      motion.velPitch = 0;
      motion.lastX = event.clientX;
      motion.lastY = event.clientY;
      stage.classList.add("is-dragging", "is-engaged");
      stage.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.over = true;
      if (!motion.dragging) return;

      const dx = event.clientX - motion.lastX;
      const dy = event.clientY - motion.lastY;
      motion.lastX = event.clientX;
      motion.lastY = event.clientY;

      const yaw = dx * 0.0052;
      const pitch = dy * 0.0052;
      motion.targetYaw += yaw;
      motion.targetPitch += pitch;
      motion.velYaw = yaw;
      motion.velPitch = pitch;
    };

    const endDrag = () => {
      motion.dragging = false;
      stage.classList.remove("is-dragging");
    };

    const onPointerLeave = () => {
      pointer.over = false;
      if (!motion.dragging) endDrag();
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1;
      const yaw = event.deltaX * unit * 0.0021;
      const pitch = event.deltaY * unit * 0.0015;
      motion.targetYaw += yaw;
      motion.targetPitch += pitch;
      motion.velYaw = yaw * 0.22;
      motion.velPitch = pitch * 0.22;
      stage.classList.add("is-engaged");
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const step = 0.14;
      if (event.key === "ArrowRight") motion.targetYaw += step;
      else if (event.key === "ArrowLeft") motion.targetYaw -= step;
      else if (event.key === "ArrowDown") motion.targetPitch += step;
      else if (event.key === "ArrowUp") motion.targetPitch -= step;
      else return;
      event.preventDefault();
      stage.classList.add("is-engaged");
    };

    const measure = () => {
      const rect = stage.getBoundingClientRect();
      const min = Math.min(rect.width, rect.height);
      metrics.radius = min * (rect.width < 720 ? 0.4 : 0.34);
      metrics.cardW = gsap.utils.clamp(112, 210, metrics.radius * 0.58);
      metrics.perspective = gsap.utils.clamp(760, 1400, min * 1.25);
      stage.style.perspective = `${metrics.perspective}px`;
      stage.style.setProperty("--card-w", `${metrics.cardW}px`);
      stage.style.setProperty("--card-h", `${metrics.cardW * (9 / 16)}px`);
    };

    const render = () => {
      const rect = stage.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const { radius, perspective, cardW } = metrics;
      const hoverReach = cardW * 0.72;

      let hotIndex = -1;
      let hotDistance = hoverReach;

      if (pointer.over && !motion.dragging) {
        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          const placed = apply(matrix, point.x, point.y, point.z);
          const depthScale =
            perspective /
            Math.max(180, perspective - placed.z * radius * motion.spread);
          const sx = centerX + placed.x * radius * motion.spread * depthScale;
          const sy = centerY - placed.y * radius * motion.spread * depthScale;
          const distance = Math.hypot(pointer.x - sx, pointer.y - sy);
          if (distance < hotDistance && placed.z > -0.15) {
            hotDistance = distance;
            hotIndex = i;
          }
        }
      }

      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const placed = apply(matrix, point.x, point.y, point.z);
        const targetHover = i === hotIndex ? 1 : 0;
        point.hover += (targetHover - point.hover) * 0.08;

        const depth = placed.z * 0.5 + 0.5;
        const fade = Math.min(1, motion.spread * 1.35);

        gsap.set(point.el, {
          x: placed.x * radius * motion.spread,
          y: -placed.y * radius * motion.spread,
          z: placed.z * radius * motion.spread + point.hover * 54,
          scale: 1 + point.hover * 0.12,
          opacity: (0.42 + depth * 0.58) * fade,
          filter: `brightness(${0.55 + depth * 0.45 + point.hover * 0.22})`,
        });

        const hot = i === hotIndex;
        if (hot !== point.el.classList.contains("is-hot")) {
          point.el.classList.toggle("is-hot", hot);
        }
      }

      const showPopup =
        hotIndex >= 0 && !mobileQuery.matches && !motion.dragging;

      if (!showPopup) {
        if (popup.classList.contains("is-visible")) {
          popup.classList.remove("is-visible");
          popup.setAttribute("aria-hidden", "true");
        }
        if (hotIndex < 0) lastHot = -1;
      } else if (hotIndex !== lastHot) {
        lastHot = hotIndex;
        const movie = MOVIES[hotIndex];
        if (kickerEl) kickerEl.textContent = String(movie.id).padStart(2, "0");
        if (titleEl) titleEl.textContent = movie.title;
        if (copyEl) copyEl.textContent = movie.description;
        popup.setAttribute("aria-hidden", "false");
        popup.classList.remove("is-visible");
        void popup.offsetWidth;
        popup.classList.add("is-visible");
      }

      if (showPopup) {
        const box = points[hotIndex].el.getBoundingClientRect();
        const popupW = popup.offsetWidth;
        const popupH = popup.offsetHeight;
        let left = box.left - rect.left - popupW - 18;
        let top = box.top - rect.top + box.height / 2 - popupH / 2;
        left = Math.max(20, Math.min(left, rect.width - popupW - 20));
        top = Math.max(72, Math.min(top, rect.height - popupH - 72));
        popup.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      }
    };

    const tick = () => {
      if (!motion.dragging) {
        motion.targetYaw += motion.velYaw;
        motion.targetPitch += motion.velPitch;
        motion.velYaw *= 0.955;
        motion.velPitch *= 0.955;
        if (!reducedMotion) motion.targetYaw += 0.00115;
      }

      const yawDelta = (motion.targetYaw - motion.currentYaw) * FOLLOW;
      const pitchDelta = (motion.targetPitch - motion.currentPitch) * FOLLOW;
      motion.currentYaw += yawDelta;
      motion.currentPitch += pitchDelta;

      if (yawDelta !== 0 || pitchDelta !== 0) {
        matrix = orthonormalize(
          multiply(rotX(pitchDelta), multiply(rotY(yawDelta), matrix)),
        );
      }

      render();
      stage.classList.add("is-ready");
    };

    measure();
    gsap.set(cards, { force3D: true, transformOrigin: "50% 50%" });

    const intro = reducedMotion
      ? null
      : gsap.to(motion, { spread: 1, duration: 1.7, ease: "power3.out" });

    gsap.ticker.add(tick);
    window.addEventListener("resize", measure);
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("pointerleave", onPointerLeave);
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("keydown", onKeyDown);

    return () => {
      intro?.kill();
      gsap.ticker.remove(tick);
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", endDrag);
      stage.removeEventListener("pointercancel", endDrag);
      stage.removeEventListener("pointerleave", onPointerLeave);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section
      ref={stageRef}
      className="sphere-stage"
      tabIndex={0}
      aria-label="Cinematic movie sphere. Drag, scroll, or use the arrow keys to rotate. Hover a still for its story."
    >
      <div className="sphere-vignette" aria-hidden="true" />
      <div className="sphere-grain" aria-hidden="true" />
      <div className="sphere-glow" aria-hidden="true" />
      <div ref={sphereRef} className="sphere">
        {MOVIES.map((movie) => (
          <div key={movie.id} data-card className="sphere-card">
            <span className="card-stroke card-stroke-glow" aria-hidden="true" />
            <span className="card-stroke" aria-hidden="true" />
            <div className="card-frame">
              <Image
                src={movie.src}
                alt={movie.title}
                fill
                sizes="240px"
                loading="eager"
                className="sphere-card-image"
                draggable={false}
              />
            </div>
          </div>
        ))}
      </div>
      <aside ref={popupRef} className="movie-popup" aria-hidden="true">
        <p className="movie-popup-kicker" data-popup-kicker />
        <h2 className="movie-popup-title" data-popup-title />
        <p className="movie-popup-copy" data-popup-copy />
      </aside>
      <header className="cinema-bar cinema-bar-top">
        <span className="cinema-kicker">Feature Presentation</span>
        <span className="cinema-title">Movie Universe</span>
      </header>
      <footer className="cinema-bar cinema-bar-bottom">
        <p className="sphere-hint">Drag or scroll to spin</p>
      </footer>
    </section>
  );
}

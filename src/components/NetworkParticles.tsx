import React, { useEffect, useRef } from "react";

/**
 * Полноэкранный фон из частиц с соединяющими линиями.
 * Никаких внешних библиотек. Оптимизирован под HiDPI.
 */
export const NetworkParticles: React.FC<{
  className?: string;          // доп. классы (например, opacity-60)
  count?: number;              // число точек
  maxLineDist?: number;        // макс. дистанция для линии в px
  speed?: number;              // базовая скорость (0.2–0.6)
  color?: string;              // RGB без альфы, например '255,255,255'
  dotOpacity?: number;         // непрозрачность точек (0..1)
  lineOpacity?: number;        // базовая непрозрачность линий (0..1)
}> = ({
  className = "",
  count = 80,
  maxLineDist = 140,
  speed = 0.35,
  color = "255,255,255",
  dotOpacity = 0.85,
  lineOpacity = 0.25,
}) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;

    let w = 0, h = 0, dpr = Math.max(1, window.devicePixelRatio || 1);
    const setSize = () => {
      const { clientWidth, clientHeight } = canvas;
      w = clientWidth;
      h = clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // рисуем в CSS-пикселях
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(canvas);

    type P = { x: number; y: number; vx: number; vy: number; r: number };
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    const pts: P[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: rnd(-speed, speed),
      vy: rnd(-speed, speed),
      r: rnd(1, 2), // радиус точки
    }));

    // курсор — для «магнитных» линий и лёгкого отталкивания
    const mouse = { x: -9999, y: -9999 };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, w, h);

      // обновление позиций
      for (const p of pts) {
        // лёгкое отталкивание от курсора
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const md = Math.hypot(dx, dy);
        if (md < 80) {
          const f = (80 - md) / 80; // 0..1
          p.vx += (dx / (md || 1)) * f * 0.02;
          p.vy += (dy / (md || 1)) * f * 0.02;
        }

        p.x += p.vx;
        p.y += p.vy;

        // «отскок» от краёв
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        p.x = Math.max(0, Math.min(w, p.x));
        p.y = Math.max(0, Math.min(h, p.y));
      }

      // линии между близкими точками
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < maxLineDist) {
            const t = 1 - d / maxLineDist; // ближе — толще/ярче
            ctx.strokeStyle = `rgba(${color}, ${lineOpacity * t * t})`;
            ctx.lineWidth = Math.max(1, t) * 1; // 1..2
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        // линия к курсору
        const mx = a.x - mouse.x;
        const my = a.y - mouse.y;
        const md = Math.hypot(mx, my);
        if (md < maxLineDist * 0.9) {
          const t = 1 - md / (maxLineDist * 0.9);
          ctx.strokeStyle = `rgba(${color}, ${lineOpacity * 1.2 * t})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      // сами точки
      ctx.fillStyle = `rgba(${color}, ${dotOpacity})`;
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    tick();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [count, maxLineDist, speed, color, dotOpacity, lineOpacity]);

  return (
    <canvas
      ref={ref}
      className={`fixed inset-0 w-full h-full pointer-events-auto ${className}`}
      aria-hidden
    />
  );
};

export default NetworkParticles;

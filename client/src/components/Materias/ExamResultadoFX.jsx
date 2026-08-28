import { useEffect, useRef } from "react";

// ─── Sonidos con Web Audio API (sin archivos externos) ───────────────────────

function playWinSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const notas = [
      { freq: 523.25, t: 0.0 },   // C5
      { freq: 659.25, t: 0.12 },  // E5
      { freq: 783.99, t: 0.24 },  // G5
      { freq: 1046.5, t: 0.38 },  // C6
      { freq: 1318.5, t: 0.52 },  // E6
    ];

    notas.forEach(({ freq, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + t);

      gain.gain.setValueAtTime(0, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35);

      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.4);
    });

    // Acorde final brillante
    [1046.5, 1318.5, 1568.0].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + 0.7);

      gain.gain.setValueAtTime(0, ctx.currentTime + 0.7);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.72);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);

      osc.start(ctx.currentTime + 0.7);
      osc.stop(ctx.currentTime + 1.7);
    });
  } catch (_) {}
}

function playLoseSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const notas = [
      { freq: 392.0,  t: 0.0  },  // G4
      { freq: 349.23, t: 0.22 },  // F4
      { freq: 311.13, t: 0.44 },  // Eb4
      { freq: 261.63, t: 0.70 },  // C4
    ];

    notas.forEach(({ freq, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + t);

      gain.gain.setValueAtTime(0, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);

      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.45);
    });

    // Nota larga y triste al final
    const oscFinal = ctx.createOscillator();
    const gainFinal = ctx.createGain();
    oscFinal.connect(gainFinal);
    gainFinal.connect(ctx.destination);
    oscFinal.type = "sine";
    oscFinal.frequency.setValueAtTime(220, ctx.currentTime + 1.0);
    oscFinal.frequency.linearRampToValueAtTime(196, ctx.currentTime + 1.8);
    gainFinal.gain.setValueAtTime(0, ctx.currentTime + 1.0);
    gainFinal.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 1.05);
    gainFinal.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);
    oscFinal.start(ctx.currentTime + 1.0);
    oscFinal.stop(ctx.currentTime + 2.3);
  } catch (_) {}
}

// ─── Confeti (Canvas) ─────────────────────────────────────────────────────────

const COLORES_CONFETI = [
  "#f43f5e", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#a855f7", "#ec4899",
];

function initConfeti(canvas) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const piezas = [];
  const TOTAL = 160;

  for (let i = 0; i < TOTAL; i++) {
    piezas.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.4 - H * 0.4,
      w: Math.random() * 10 + 6,
      h: Math.random() * 5 + 3,
      color: COLORES_CONFETI[Math.floor(Math.random() * COLORES_CONFETI.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 3 + 1.5,
      angulo: Math.random() * Math.PI * 2,
      vAngulo: (Math.random() - 0.5) * 0.15,
      opacidad: 1,
    });
  }

  let raf;
  let tick = 0;

  function animar() {
    tick++;
    ctx.clearRect(0, 0, W, H);

    piezas.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.angulo += p.vAngulo;
      p.vy += 0.04; // gravedad suave

      // Desvanecer cuando pasa la mitad inferior
      if (p.y > H * 0.6) {
        p.opacidad -= 0.012;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacidad);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angulo);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (tick < 220) {
      raf = requestAnimationFrame(animar);
    } else {
      ctx.clearRect(0, 0, W, H);
    }
  }

  animar();
  return () => cancelAnimationFrame(raf);
}

// ─── Gotas de lluvia (Canvas) ─────────────────────────────────────────────────

function initLluvia(canvas) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const gotas = [];
  const TOTAL = 80;

  for (let i = 0; i < TOTAL; i++) {
    gotas.push({
      x: Math.random() * W,
      y: Math.random() * H,
      largo: Math.random() * 18 + 8,
      velocidad: Math.random() * 4 + 3,
      opacidad: Math.random() * 0.5 + 0.2,
    });
  }

  let raf;
  let tick = 0;

  function animar() {
    tick++;
    ctx.clearRect(0, 0, W, H);

    // Fade in las primeras frames
    const alphaBase = Math.min(1, tick / 30);

    gotas.forEach((g) => {
      g.y += g.velocidad;
      if (g.y > H) {
        g.y = -g.largo;
        g.x = Math.random() * W;
      }

      ctx.save();
      ctx.globalAlpha = g.opacidad * alphaBase;
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x - 1, g.y + g.largo);
      ctx.stroke();
      ctx.restore();
    });

    if (tick < 300) {
      raf = requestAnimationFrame(animar);
    } else {
      // Fade out gradual al terminar
      let fade = 1;
      const fadeOut = () => {
        fade -= 0.03;
        ctx.clearRect(0, 0, W, H);
        if (fade > 0) {
          gotas.forEach((g) => {
            g.y += g.velocidad;
            if (g.y > H) { g.y = -g.largo; g.x = Math.random() * W; }
            ctx.save();
            ctx.globalAlpha = g.opacidad * fade;
            ctx.strokeStyle = "#60a5fa";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(g.x, g.y);
            ctx.lineTo(g.x - 1, g.y + g.largo);
            ctx.stroke();
            ctx.restore();
          });
          requestAnimationFrame(fadeOut);
        } else {
          ctx.clearRect(0, 0, W, H);
        }
      };
      fadeOut();
    }
  }

  animar();
  return () => cancelAnimationFrame(raf);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ExamResultadoFX({ aprobado, tiempoExpirado }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    // No hay efecto si el tiempo expiró (resultado neutro)
    if (tiempoExpirado) return;

    // Pequeño delay para que el DOM esté pintado
    const delay = setTimeout(() => {
      if (aprobado) {
        playWinSound();
      } else {
        playLoseSound();
      }
    }, 300);

    const canvas = canvasRef.current;
    if (!canvas) return () => clearTimeout(delay);

    // Ajustar tamaño al contenedor padre
    const parent = canvas.parentElement;
    canvas.width = parent?.offsetWidth || window.innerWidth;
    canvas.height = parent?.offsetHeight || window.innerHeight;

    let cleanup;
    const animDelay = setTimeout(() => {
      cleanup = aprobado ? initConfeti(canvas) : initLluvia(canvas);
    }, 100);

    return () => {
      clearTimeout(delay);
      clearTimeout(animDelay);
      cleanup?.();
    };
  }, [aprobado, tiempoExpirado]);

  if (tiempoExpirado) return null;

  return (
    <>
      {/* Canvas superpuesto — pointer-events none para no bloquear clicks */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 999,
        }}
      />

      {/* Emoji animado centrado */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "6rem",
          pointerEvents: "none",
          zIndex: 1000,
          animation: aprobado
            ? "fx-pop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards"
            : "fx-shake 0.6s ease forwards",
          animationDelay: "0.2s",
          opacity: 0,
        }}
      >
        {aprobado ? "🏆" : "😢"}
      </div>

      <style>{`
        @keyframes fx-pop {
          0%   { transform: translate(-50%,-50%) scale(0);   opacity: 0; }
          60%  { transform: translate(-50%,-50%) scale(1.3); opacity: 1; }
          80%  { transform: translate(-50%,-50%) scale(0.9); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(0);   opacity: 0; }
        }
        @keyframes fx-shake {
          0%   { transform: translate(-50%,-50%) scale(0);    opacity: 0; }
          20%  { transform: translate(-50%,-50%) scale(1.1);  opacity: 1; }
          35%  { transform: translate(-48%,-50%) scale(1.05); opacity: 1; }
          50%  { transform: translate(-52%,-50%) scale(1.05); opacity: 1; }
          65%  { transform: translate(-48%,-50%) scale(1.0);  opacity: 1; }
          80%  { transform: translate(-50%,-50%) scale(1.0);  opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(0);    opacity: 0; }
        }
      `}</style>
    </>
  );
}
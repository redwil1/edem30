"use client";

import { useEffect, useRef, useState } from "react";

// Множители параллакса по слоям (px смещения на краю контейнера).
const PARALLAX = {
  city: 3,
  car: 10,
  glow: 6,
};

// Насколько быстро текущее смещение "догоняет" целевое — меньше значение,
// плавнее и "дороже" ощущается движение.
const EASE = 0.07;

export default function HeroCarScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let target = { x: 0, y: 0 };
    let current = { x: 0, y: 0 };
    let raf = 0;
    let running = true;

    function onPointerMove(e: PointerEvent) {
      const rect = container!.getBoundingClientRect();
      target = {
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      };
    }

    function onPointerLeave() {
      target = { x: 0, y: 0 };
    }

    function tick() {
      if (!running) return;

      current.x += (target.x - current.x) * EASE;
      current.y += (target.y - current.y) * EASE;

      if (cityRef.current) {
        cityRef.current.style.transform = `translate3d(${current.x * PARALLAX.city}px, ${
          current.y * PARALLAX.city
        }px, 0)`;
      }
      if (carRef.current) {
        carRef.current.style.transform = `translate3d(${current.x * PARALLAX.car}px, ${
          current.y * PARALLAX.car
        }px, 0)`;
      }
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${current.x * PARALLAX.glow}px, ${
          current.y * PARALLAX.glow
        }px, 0)`;
      }

      raf = requestAnimationFrame(tick);
    }

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={containerRef} className="hero-scene">
      {/* Слой 1 — город (самый задний) */}
      <div ref={cityRef} className="hero-layer-wrapper hero-layer-city">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero/city.png"
          alt=""
          aria-hidden
          className={`hero-layer-img ${mounted ? "is-in" : ""}`}
          style={{ transitionDelay: "0ms" }}
        />
        <div className="hero-city-flicker" />
      </div>

      {/* Слой 2 — машина (средний) */}
      <div ref={carRef} className="hero-layer-wrapper hero-layer-car">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero/car.png"
          alt="Машина Едем30"
          className={`hero-layer-img ${mounted ? "is-in" : ""}`}
          style={{ transitionDelay: "100ms" }}
        />
        <div className="hero-headlight-glow" />
      </div>

      {/* Слой 3 — свечение (передний) */}
      <div ref={glowRef} className="hero-layer-wrapper hero-layer-glow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero/glow.png"
          alt=""
          aria-hidden
          className={`hero-layer-img ${mounted ? "is-in" : ""}`}
          style={{ transitionDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

export type HeroClip = { src: string; poster: string };

/**
 * Full-bleed hero background that cross-fades through a list of muted clips,
 * one after another, looping. Muted + playsInline so mobile autoplay is
 * allowed. Reduced-motion users get a single static poster, no playback,
 * no rotation.
 */
export function HeroVideo({
  clips,
  className = "",
}: {
  clips: HeroClip[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [allowMotion, setAllowMotion] = useState(true);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setAllowMotion(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!allowMotion) return;
    const v = refs.current[index];
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
  }, [index, allowMotion]);

  if (!allowMotion) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={clips[0].poster}
        alt=""
        aria-hidden="true"
        className={`${className} h-full w-full object-cover`}
      />
    );
  }

  return (
    <div className={className} aria-hidden="true">
      {clips.map((clip, i) => (
        <video
          key={clip.src}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-snappy ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          poster={clip.poster}
          autoPlay={i === 0}
          muted
          playsInline
          preload={i === 0 ? "auto" : "metadata"}
          tabIndex={-1}
          onEnded={() => setIndex((n) => (n + 1) % clips.length)}
        >
          <source src={clip.src} type="video/mp4" />
        </video>
      ))}
    </div>
  );
}

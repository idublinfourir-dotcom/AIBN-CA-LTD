"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Global top progress bar. Appears the moment an internal link is clicked and
 * completes when the new route renders, so every navigation (nav links, the
 * account pill, CTAs) shows immediate "it's loading" feedback, even while a
 * server layout/page is still resolving.
 *
 * The bar starts optimistically on click and normally finishes when `pathname`
 * changes. But some clicks never change the pathname: a navigation that's
 * prevented, aborted, redirects back to the same path, or hangs. Those used to
 * leave the bar stuck at 90% forever (the pathname-change effect was the ONLY
 * thing that hid it). A FAILSAFE timer now force-finishes the bar so it can
 * never hang, whatever happens to the navigation.
 */
const FAILSAFE_MS = 8000;

export function RouteProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [show, setShow] = useState(false);
  const [fast, setFast] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const failsafeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const firstRender = useRef(true);

  // Complete + hide, clearing pending timers. Stable identity (only touches
  // refs and setState functions), so timers and effects can safely close over
  // it. Safe to call anytime; if the bar isn't showing it just no-ops visually.
  const finish = useCallback(() => {
    clearTimeout(failsafeTimer.current);
    clearTimeout(hideTimer.current);
    setFast(true);
    setWidth(100);
    hideTimer.current = setTimeout(() => {
      setShow(false);
      setWidth(0);
      setFast(false);
    }, 280);
  }, []);

  // Start when an internal link is clicked (capture phase, before navigation).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const anchor = (e.target as Element)?.closest?.("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return; // same page / hash

      // begin: show the bar and creep toward 90% with the slow transition.
      clearTimeout(hideTimer.current);
      clearTimeout(failsafeTimer.current);
      setFast(false);
      setShow(true);
      setWidth(8);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setWidth(90)),
      );
      // Failsafe: if the navigation never lands (prevented / aborted / hung /
      // redirect to the same path), finish anyway so the bar can't get stuck.
      failsafeTimer.current = setTimeout(finish, FAILSAFE_MS);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [finish]);

  // Complete when the route actually changes (the fast, normal path).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    finish();
  }, [pathname, finish]);

  // Clear timers on unmount.
  useEffect(
    () => () => {
      clearTimeout(hideTimer.current);
      clearTimeout(failsafeTimer.current);
    },
    [],
  );

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] transition-opacity duration-200 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="h-full bg-primary-500 shadow-[0_0_10px_1px] shadow-primary-400"
        style={{
          width: `${width}%`,
          transition: fast
            ? "width 200ms ease-out"
            : "width 9000ms cubic-bezier(0.08,0.7,0.2,1)",
        }}
      />
    </div>
  );
}

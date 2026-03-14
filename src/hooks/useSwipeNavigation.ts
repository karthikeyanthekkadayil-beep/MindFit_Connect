import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { id: "home", path: "/dashboard" },
  { id: "plan", path: "/planner" },
  { id: "social", path: "/communities" },
  { id: "progress", path: "/progress" },
  { id: "profile", path: "/profile" },
];

const SWIPE_THRESHOLD = 50;
const SWIPE_MAX_Y = 80; // max vertical movement to still count as horizontal swipe

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const getCurrentIndex = useCallback(() => {
    const path = location.pathname;
    const idx = tabs.findIndex(
      (t) => path === t.path || path.startsWith(t.path + "/")
    );
    return idx >= 0 ? idx : -1;
  }, [location.pathname]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = Math.abs(touch.clientY - touchStart.current.y);
      touchStart.current = null;

      if (Math.abs(dx) < SWIPE_THRESHOLD || dy > SWIPE_MAX_Y) return;

      const currentIndex = getCurrentIndex();
      if (currentIndex < 0) return;

      const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex < 0 || nextIndex >= tabs.length) return;

      if ("vibrate" in navigator) navigator.vibrate(10);
      navigate(tabs[nextIndex].path);
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [getCurrentIndex, navigate]);
}

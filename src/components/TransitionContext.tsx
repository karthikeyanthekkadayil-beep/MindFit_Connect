import { createContext, useContext, useRef, useCallback, ReactNode } from "react";

interface TransitionOrigin {
  x: number;
  y: number;
}

interface TransitionContextType {
  origin: React.MutableRefObject<TransitionOrigin>;
  captureOrigin: (e: React.MouseEvent | MouseEvent) => void;
}

const TransitionContext = createContext<TransitionContextType | null>(null);

export const TransitionProvider = ({ children }: { children: ReactNode }) => {
  const origin = useRef<TransitionOrigin>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const captureOrigin = useCallback((e: React.MouseEvent | MouseEvent) => {
    origin.current = { x: e.clientX, y: e.clientY };
  }, []);

  return (
    <TransitionContext.Provider value={{ origin, captureOrigin }}>
      {children}
    </TransitionContext.Provider>
  );
};

export const useTransitionOrigin = () => {
  const ctx = useContext(TransitionContext);
  if (!ctx) throw new Error("useTransitionOrigin must be used within TransitionProvider");
  return ctx;
};

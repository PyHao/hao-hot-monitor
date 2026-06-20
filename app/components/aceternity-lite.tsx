"use client";

import type { CSSProperties, ReactNode } from "react";

type BaseProps = {
  className?: string;
};

export function BackgroundBeams({ className }: BaseProps) {
  return (
    <div aria-hidden className={['aceternity-beams', className].filter(Boolean).join(" ")}>
      <span className="aceternity-beam aceternity-beam-one" />
      <span className="aceternity-beam aceternity-beam-two" />
      <span className="aceternity-beam aceternity-beam-three" />
    </div>
  );
}

type HighlightProps = {
  children: ReactNode;
  className?: string;
};

export function Highlight({ children, className }: HighlightProps) {
  return <span className={['aceternity-highlight', className].filter(Boolean).join(" ")}>{children}</span>;
}

export function cardStyle(accent: string): CSSProperties {
  return { ["--accent" as never]: accent };
}
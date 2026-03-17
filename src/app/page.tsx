"use client";

import { useState, useCallback } from "react";
import SphereField from "@/components/SphereField";

// ─── Cycling subhead lines ─────────────────────────────────────────────────────
const SUBHEADS = [
  "Just a guy that takes technology seriously.",
  "The tools keep changing. The questions stay the same.",
  "Still figuring out what to do with all of it.",
];

export default function Home() {
  const [index, setIndex]     = useState(0);
  const [visible, setVisible] = useState(true);

  const handleSubheadClick = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setIndex(i => (i + 1) % SUBHEADS.length);
      setVisible(true);
    }, 220);
  }, []);

  return (
    <main
      style={{
        position:      "fixed",
        inset:         0,
        background:    "var(--bg)",
        overflow:      "hidden",
        display:       "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Sphere canvas ── */}
      <SphereField />

      {/* ── Content layer ── */}
      <div
        style={{
          position:      "relative",
          zIndex:        1,
          display:       "flex",
          flexDirection: "column",
          height:        "100%",
          padding:       "clamp(2rem, 5vw, 4rem) clamp(2rem, 6vw, 6rem)",
          pointerEvents: "none",
        }}
      >
        {/* Top-left: name + subhead */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", maxWidth: "42%" }}>
          <div>
            <h1
              style={{
                fontSize:      "clamp(2.8rem, 5.5vw, 6rem)",
                fontFamily:    "Georgia, 'Times New Roman', serif",
                fontStyle:     "italic",
                fontWeight:    700,
                lineHeight:    1.0,
                letterSpacing: "-0.02em",
                color:         "var(--text)",
                margin:        0,
                marginBottom:  "1.25rem",
              }}
            >
              John<br />Hibionada
            </h1>

            <div
              style={{
                width:        "40px",
                height:       "1px",
                background:   "var(--gold)",
                marginBottom: "1.25rem",
              }}
            />

            {/* Clickable cycling subhead — crosshair cursor */}
            <button
              onClick={handleSubheadClick}
              style={{
                background:    "none",
                border:        "none",
                padding:       0,
                margin:        0,
                cursor:        "crosshair",
                textAlign:     "left",
                pointerEvents: "auto",
              }}
              aria-label="Cycle through lines"
            >
              <p
                style={{
                  fontFamily:    "var(--font-jetbrains)",
                  fontSize:      "clamp(0.85rem, 1.3vw, 1.4rem)",
                  color:         "var(--muted)",
                  letterSpacing: "0.01em",
                  margin:        0,
                  lineHeight:    1.5,
                  opacity:       visible ? 1 : 0,
                  transition:    "opacity 0.22s ease",
                  userSelect:    "none",
                }}
              >
                {SUBHEADS[index]}
              </p>
            </button>

            {/* Location line */}
            <p
              style={{
                fontFamily:    "var(--font-jetbrains)",
                fontSize:      "clamp(0.75rem, 1.1vw, 1.15rem)",
                color:         "var(--muted)",
                letterSpacing: "0.08em",
                margin:        0,
                marginTop:     "0.6rem",
                opacity:       0.45,
                userSelect:    "none",
              }}
            >
              Los Angeles
            </p>
          </div>
        </div>

        {/* Bottom-right: .tech link */}
        <div
          style={{
            display:        "flex",
            justifyContent: "flex-end",
            alignItems:     "flex-end",
            pointerEvents:  "auto",
          }}
        >
          <a
            href="https://johnhib.tech"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily:     "var(--font-jetbrains)",
              fontSize:       "0.72rem",
              color:          "var(--muted)",
              textDecoration: "none",
              letterSpacing:  "0.04em",
              transition:     "color 0.25s ease",
              lineHeight:     1,
            }}
            onMouseEnter={e => ((e.target as HTMLElement).style.color = "var(--gold)")}
            onMouseLeave={e => ((e.target as HTMLElement).style.color = "var(--muted)")}
          >
            johnhib.tech →
          </a>
        </div>
      </div>
    </main>
  );
}

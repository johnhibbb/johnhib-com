"use client";

import { useState, useCallback } from "react";
import SphereField from "@/components/SphereField";
import VersionBadge from "@/components/VersionBadge";

// ─── Cycling subhead lines ─────────────────────────────────────────────────────
const SUBHEADS = [
  "I create. That part was never negotiable.",
  "The tools keep changing. The questions stay the same.",
  "Still figuring out what to do with all of it.",
];

export default function Home() {
  const [index, setIndex]     = useState(0);
  const [visible, setVisible] = useState(true);
  const [formation, setFormation] = useState(0);

  const handleSubheadClick = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setIndex(i => (i + 1) % SUBHEADS.length);
      setVisible(true);
    }, 220);
  }, []);

  const handleModeToggle = useCallback(() => {
    setFormation(f => (f + 1) % 4);
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
        minWidth:      "430px",
      }}
    >
      {/* ── Sphere canvas ── */}
      <SphereField formation={formation} />

      {/* ── Version badge ── */}
      <VersionBadge />

      {/* ── Mode Toggle Button ── */}
      <div 
        style={{
          position: "absolute",
          bottom: "clamp(2rem, 6vw, 6rem)",
          left: "0",
          right: "0",
          display: "flex",
          justifyContent: "center",
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <button
          onClick={handleModeToggle}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            cursor: "pointer",
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            color: "rgba(255,255,255,0.4)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
            e.currentTarget.style.color = "rgba(255,255,255,0.8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
            e.currentTarget.style.color = "rgba(255,255,255,0.4)";
          }}
          aria-label="Toggle formation mode"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.67-5.67"/>
          </svg>
        </button>
      </div>

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
                textShadow:    "0 0 40px rgba(8,8,8,1), 0 0 80px rgba(8,8,8,0.9), 0 2px 4px rgba(0,0,0,0.8)",
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
                  color:         "var(--muted-light)",
                  letterSpacing: "0.01em",
                  margin:        0,
                  lineHeight:    1.5,
                  opacity:       visible ? 1 : 0,
                  transition:    "opacity 0.22s ease",
                  userSelect:    "none",
                  textShadow:    "0 0 30px rgba(8,8,8,1), 0 0 60px rgba(8,8,8,0.8)",
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
                color:         "var(--muted-light)",
                letterSpacing: "0.08em",
                margin:        0,
                marginTop:     "0.6rem",
                opacity:       0.45,
                userSelect:    "none",
                textShadow:    "0 0 30px rgba(8,8,8,1), 0 0 60px rgba(8,8,8,0.8)",
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
            className="tech-link"
            style={{
              fontFamily:     "var(--font-jetbrains)",
              fontSize:       "0.72rem",
              textDecoration: "none",
              lineHeight:     1,
            }}
          >
            <span className="tech-text">johnhib.tech</span>
            <span className="tech-arrow">→</span>
          </a>
        </div>
      </div>
    </main>
  );
}

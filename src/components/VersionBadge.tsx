"use client";

import { useState, useCallback } from "react";
import { versions } from "@/data/versions";

interface PreviewState {
  src: string;
  x: number;
  y: number;
}

export default function VersionBadge() {
  const [open, setOpen]       = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const current               = versions[0]; // newest first

  const handleMouseMove = useCallback((src: string, e: React.MouseEvent) => {
    setPreview({ src, x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setPreview(null);
  }, []);

  // Clamp so preview doesn't go off-screen
  const previewW = 320;
  const previewLeft = preview
    ? Math.min(preview.x + 20, (typeof window !== "undefined" ? window.innerWidth : 1200) - previewW - 16)
    : 0;
  const previewTop = preview ? preview.y - 12 : 0;

  return (
    <>
      {/* Badge */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position:      "fixed",
          bottom:        "clamp(1rem, 2vw, 1.5rem)",
          left:          "clamp(1rem, 2vw, 1.5rem)",
          zIndex:        10,
          background:    "none",
          border:        "none",
          padding:       0,
          cursor:        "pointer",
          fontFamily:    "var(--font-jetbrains, monospace)",
          fontSize:      "0.65rem",
          color:         "var(--muted, #6B6B6B)",
          letterSpacing: "0.06em",
          opacity:       0.4,
          transition:    "opacity 0.2s ease",
          userSelect:    "none",
          lineHeight:    1,
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "0.4")}
        aria-label="View version history"
      >
        v{current.version}
      </button>

      {/* Modal */}
      {open && (
        <>
          {/* Overlay — dims when preview is active */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position:   "fixed",
              inset:      0,
              zIndex:     100,
              background: preview ? "rgba(8,8,8,0.72)" : "rgba(8,8,8,0.85)",
              transition: "background 0.15s ease",
              display:    "flex",
              alignItems: "center",
              justifyContent: "center",
              padding:    "clamp(1rem, 4vw, 2rem)",
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background:   "#111",
                border:       "1px solid rgba(255,255,255,0.07)",
                borderRadius: "4px",
                maxWidth:     "560px",
                width:        "100%",
                maxHeight:    "80vh",
                overflowY:    "auto",
                padding:      "2rem",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <span style={{
                  fontFamily:    "var(--font-jetbrains, monospace)",
                  fontSize:      "0.65rem",
                  letterSpacing: "0.1em",
                  color:         "var(--muted, #6B6B6B)",
                  textTransform: "uppercase",
                }}>
                  johnhib.com — version history
                </span>
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: "none", border: "none", color: "var(--muted, #6B6B6B)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: 0 }}
                >
                  ×
                </button>
              </div>

              {/* Versions — newest first */}
              {[...versions].reverse().map((v, idx, arr) => (
                <div key={v.version} style={{ marginBottom: idx < arr.length - 1 ? "2.5rem" : 0 }}>

                  {/* Version number + date + preview icon */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <span style={{
                      fontFamily:    "var(--font-jetbrains, monospace)",
                      fontSize:      "0.9rem",
                      color:         "var(--gold, #C8A96E)",
                      letterSpacing: "0.04em",
                    }}>
                      v{v.version}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-jetbrains, monospace)",
                      fontSize:   "0.65rem",
                      color:      "var(--muted, #6B6B6B)",
                      opacity:    0.6,
                    }}>
                      {v.date}
                    </span>

                    {/* Thumbnail trigger — only if screenshot exists */}
                    {v.screenshot && (
                      <span
                        onMouseMove={e => handleMouseMove(v.screenshot!, e)}
                        onMouseLeave={handleMouseLeave}
                        style={{
                          fontFamily:    "var(--font-jetbrains, monospace)",
                          fontSize:      "0.6rem",
                          color:         "var(--gold, #C8A96E)",
                          opacity:       preview?.src === v.screenshot ? 0.9 : 0.35,
                          letterSpacing: "0.06em",
                          cursor:        "default",
                          userSelect:    "none",
                          transition:    "opacity 0.15s ease",
                          marginLeft:    "0.25rem",
                        }}
                      >
                        ⊡ preview
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <p style={{
                    fontFamily: "Georgia, serif",
                    fontStyle:  "italic",
                    fontSize:   "0.95rem",
                    color:      "var(--text, #E8E6E1)",
                    margin:     "0 0 0.75rem",
                    lineHeight: 1.4,
                  }}>
                    {v.title}
                  </p>

                  {/* Notes */}
                  <ul style={{ margin: 0, paddingLeft: "1.1rem", listStyle: "none" }}>
                    {v.notes.map((note, i) => (
                      <li key={i} style={{
                        fontFamily: "var(--font-jetbrains, monospace)",
                        fontSize:   "0.72rem",
                        color:      "var(--muted, #6B6B6B)",
                        lineHeight: 1.7,
                        position:   "relative",
                      }}>
                        <span style={{ position: "absolute", left: "-1.1rem", color: "var(--gold, #C8A96E)", opacity: 0.5 }}>—</span>
                        {note}
                      </li>
                    ))}
                  </ul>

                  {/* Divider */}
                  {idx < arr.length - 1 && (
                    <div style={{ marginTop: "2rem", height: "1px", background: "rgba(255,255,255,0.05)" }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Cursor-following preview image — above modal */}
          <div
            style={{
              position:      "fixed",
              left:          previewLeft,
              top:           previewTop,
              transform:     "translateY(-100%)",
              zIndex:        200,
              width:         previewW,
              borderRadius:  "6px",
              overflow:      "hidden",
              boxShadow:     "0 8px 40px rgba(0,0,0,0.6)",
              border:        "1px solid rgba(200,169,110,0.25)",
              pointerEvents: "none",
              opacity:       preview ? 1 : 0,
              transition:    "opacity 0.15s ease",
            }}
          >
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.src}
                alt="version preview"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}

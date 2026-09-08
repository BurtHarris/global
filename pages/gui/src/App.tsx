import React, { useState } from "react";
import { SectionEditor } from "./components/SectionEditor.js";
import { AstInspector } from "./components/AstInspector.js";
import { FormatConverterModal } from "./components/FormatConverterModal.js";
import { CanonicalPicker } from "./components/CanonicalPicker.js";

const DEFAULT_PAGE = `# MaxGirls.co Project Governance

## Executive Summary
This document establishes the **governance guidelines** for the MaxGirls.co initiative.
Iterative editing must be deterministic and preserve formatting without regex exceptions.

## Workstream Objectives
- Objective 1: Streamlined document authoring
- Objective 2: Continuous multi-agent review
- Objective 3: Seamless format conversion

> Critical Notice: All legal guidelines are subject to Colombian ethical review.
`;

export const App: React.FC = () => {
  const [content, setContent] = useState<string>(DEFAULT_PAGE);
  const [isCanonical, setIsCanonical] = useState<boolean>(true);
  const [showConverter, setShowConverter] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"editor" | "ast">("editor");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          background: "#1e293b",
          borderBottom: "1px solid #334155",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ margin: 0, fontSize: "18px", color: "#38bdf8" }}>
            M365 Copilot Pages — Studio
          </h1>
          <span style={{ fontSize: "12px", background: "#334155", padding: "2px 8px", borderRadius: "12px" }}>
            Polyglot Toolkit
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setShowConverter(true)}
            style={{
              padding: "6px 14px",
              background: "#8b5cf6",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "13px",
            }}
          >
            Export & Convert
          </button>
        </div>
      </header>

      <main style={{ display: "flex", flex: 1, overflow: "hidden", padding: "16px", gap: "16px" }}>
        {/* Left Pane: Markdown Document Editor */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <CanonicalPicker
            isCanonical={isCanonical}
            onToggleCanonical={() => setIsCanonical(!isCanonical)}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "14px", color: "#94a3b8" }}>Markdown Canvas Editor</span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => setActiveTab("editor")}
                style={{
                  padding: "4px 8px",
                  background: activeTab === "editor" ? "#334155" : "transparent",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Replacement Tools
              </button>
              <button
                onClick={() => setActiveTab("ast")}
                style={{
                  padding: "4px 8px",
                  background: activeTab === "ast" ? "#334155" : "transparent",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                AST Inspector
              </button>
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              flex: 1,
              background: "#1e293b",
              color: "#f8fafc",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid #334155",
              fontFamily: "monospace",
              fontSize: "14px",
              lineHeight: "1.6",
              resize: "none",
            }}
          />
        </div>

        {/* Right Pane: Tools & Inspector */}
        <div style={{ width: "420px", display: "flex", flexDirection: "column" }}>
          {activeTab === "editor" ? (
            <SectionEditor content={content} onUpdateContent={(newContent) => setContent(newContent)} />
          ) : (
            <AstInspector content={content} />
          )}
        </div>
      </main>

      {showConverter && (
        <FormatConverterModal content={content} onClose={() => setShowConverter(false)} />
      )}
    </div>
  );
};

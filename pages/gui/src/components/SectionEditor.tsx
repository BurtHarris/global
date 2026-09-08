import React, { useState } from "react";

interface SectionEditorProps {
  content: string;
  onUpdateContent: (newContent: string) => void;
}

export const SectionEditor: React.FC<SectionEditorProps> = ({ content, onUpdateContent }) => {
  const [targetText, setTargetText] = useState("");
  const [replacementText, setReplacementText] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleLiteralReplace = () => {
    if (!targetText) {
      setStatus("Error: Enter text to find.");
      return;
    }
    if (!content.includes(targetText)) {
      setStatus("Error: Target text not found in current page.");
      return;
    }

    const updated = content.replace(targetText, replacementText);
    onUpdateContent(updated);
    setStatus("Success: Replaced literal text without regex errors.");
    setTargetText("");
    setReplacementText("");
  };

  return (
    <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", marginTop: "16px" }}>
      <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", color: "#38bdf8" }}>
        Deterministic Literal Text Replacement (Regex-Free)
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <input
          type="text"
          placeholder="Exact text to replace (including markdown punctuation)..."
          value={targetText}
          onChange={(e) => setTargetText(e.target.value)}
          style={{
            padding: "8px",
            background: "#0f172a",
            border: "1px solid #334155",
            color: "#fff",
            borderRadius: "4px",
          }}
        />
        <input
          type="text"
          placeholder="New replacement text..."
          value={replacementText}
          onChange={(e) => setReplacementText(e.target.value)}
          style={{
            padding: "8px",
            background: "#0f172a",
            border: "1px solid #334155",
            color: "#fff",
            borderRadius: "4px",
          }}
        />
        <button
          onClick={handleLiteralReplace}
          style={{
            padding: "8px 16px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
            alignSelf: "flex-start",
          }}
        >
          Apply Literal Edit
        </button>
        {status && (
          <div
            style={{
              fontSize: "13px",
              color: status.startsWith("Error") ? "#f87171" : "#4ade80",
            }}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
};

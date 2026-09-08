import React from "react";

interface AstInspectorProps {
  content: string;
}

export const AstInspector: React.FC<AstInspectorProps> = ({ content }) => {
  const lines = content.split("\n");
  const nodes = lines
    .map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("#")) {
        const level = trimmed.match(/^#+/)?.[0].length || 1;
        return { id: idx, type: `Heading (H${level})`, text: trimmed.replace(/^#+\s*/, "") };
      }
      if (trimmed.startsWith("```")) {
        return { id: idx, type: "Code Fence", text: trimmed };
      }
      if (trimmed.startsWith(">")) {
        return { id: idx, type: "Callout Block", text: trimmed.slice(1).trim() };
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return { id: idx, type: "List Item", text: trimmed.slice(2) };
      }
      return { id: idx, type: "Paragraph", text: trimmed };
    })
    .filter(Boolean);

  return (
    <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", height: "100%", overflowY: "auto" }}>
      <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", color: "#a855f7" }}>
        CommonMark Document AST Explorer
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {nodes.map((n) => (
          <div
            key={n!.id}
            style={{
              padding: "6px 10px",
              background: "#0f172a",
              borderRadius: "4px",
              borderLeft: "3px solid #a855f7",
              fontSize: "12px",
            }}
          >
            <strong style={{ color: "#c084fc" }}>[{n!.type}]</strong> {n!.text}
          </div>
        ))}
      </div>
    </div>
  );
};

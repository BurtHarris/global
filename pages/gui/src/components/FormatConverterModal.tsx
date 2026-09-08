import React, { useState } from "react";

interface FormatConverterModalProps {
  content: string;
  onClose: () => void;
}

export const FormatConverterModal: React.FC<FormatConverterModalProps> = ({ content, onClose }) => {
  const [targetFormat, setTargetFormat] = useState<"commonmark" | "html" | "json-ast" | "text">("html");
  const [converted, setConverted] = useState<string>("");

  const handleConvert = () => {
    if (targetFormat === "commonmark") {
      setConverted(content);
    } else if (targetFormat === "html") {
      setConverted(`<h1>Rendered Page</h1>\n<div>\n${content.replace(/\n/g, "<br/>\n")}\n</div>`);
    } else if (targetFormat === "json-ast") {
      const lines = content.split("\n").filter((l) => l.trim().length > 0);
      const ast = {
        type: "root",
        children: lines.map((l, i) => ({ id: i, type: "block", text: l })),
      };
      setConverted(JSON.stringify(ast, null, 2));
    } else if (targetFormat === "text") {
      setConverted(content.replace(/[#*`_>]/g, "").trim());
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#1e293b",
          padding: "24px",
          borderRadius: "8px",
          width: "600px",
          maxWidth: "90%",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "#38bdf8" }}>Format Conversion System</h3>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "18px" }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <label style={{ fontSize: "14px", color: "#cbd5e1" }}>Target Format:</label>
          <select
            value={targetFormat}
            onChange={(e) => setTargetFormat(e.target.value as any)}
            style={{ padding: "6px 12px", background: "#0f172a", color: "#fff", border: "1px solid #334155", borderRadius: "4px" }}
          >
            <option value="html">M365 / Loop HTML</option>
            <option value="commonmark">Standard CommonMark</option>
            <option value="json-ast">Structured JSON AST</option>
            <option value="text">Plain Text</option>
          </select>
          <button
            onClick={handleConvert}
            style={{ padding: "6px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
          >
            Convert
          </button>
        </div>
        {converted && (
          <textarea
            readOnly
            value={converted}
            rows={10}
            style={{ width: "100%", background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155", borderRadius: "4px", padding: "10px", fontFamily: "monospace" }}
          />
        )}
      </div>
    </div>
  );
};

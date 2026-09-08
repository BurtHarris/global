import React from "react";

interface CanonicalPickerProps {
  isCanonical: boolean;
  onToggleCanonical: () => void;
}

export const CanonicalPicker: React.FC<CanonicalPickerProps> = ({ isCanonical, onToggleCanonical }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: isCanonical ? "#064e3b" : "#451a03",
        border: `1px solid ${isCanonical ? "#059669" : "#d97706"}`,
        padding: "8px 16px",
        borderRadius: "6px",
        marginBottom: "16px",
      }}
    >
      <div>
        <strong style={{ color: isCanonical ? "#34d399" : "#fbbf24" }}>
          {isCanonical ? "Canonical Version" : "Duplicate / Workaround Draft"}
        </strong>
        <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#e2e8f0" }}>
          {isCanonical
            ? "This document is designated as the single authoritative copy."
            : "This draft was created to bypass an update failure and is not canonical."}
        </p>
      </div>
      <button
        onClick={onToggleCanonical}
        style={{
          padding: "6px 12px",
          background: isCanonical ? "#059669" : "#d97706",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        {isCanonical ? "Mark as Duplicate" : "Set as Canonical"}
      </button>
    </div>
  );
};

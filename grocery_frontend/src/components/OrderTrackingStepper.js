import React from "react";
import { ORDER_STATUSES } from "../services/orderService";

/**
 * PUBLIC_INTERFACE
 * OrderTrackingStepper displays a horizontal step indicator with timestamps.
 * Props:
 * - status: current status string
 * - timestamps: { PLACED?, PACKED?, OUT_FOR_DELIVERY?, DELIVERED? } iso strings or null
 */
export default function OrderTrackingStepper({ status, timestamps = {} }) {
  const currentIndex = Math.max(0, ORDER_STATUSES.indexOf(status));
  return (
    <div className="order-stepper" style={{ display: "flex", gap: 16, alignItems: "center" }}>
      {ORDER_STATUSES.map((s, idx) => {
        const active = idx <= currentIndex;
        const isCurrent = idx === currentIndex;
        const time = timestamps?.[s] ? new Date(timestamps[s]).toLocaleString() : null;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              title={s}
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                border: "2px solid " + (active ? "var(--primary)" : "#e5e7eb"),
                background: active
                  ? "linear-gradient(135deg, rgba(37,99,235,0.15), #ffffff)"
                  : "#ffffff",
                color: active ? "var(--primary)" : "#6b7280",
                fontSize: 14,
                fontWeight: 700,
                boxShadow: active ? "0 2px 6px rgba(37,99,235,0.25)" : "none",
              }}
            >
              {idx + 1}
            </div>
            <div style={{ minWidth: 120 }}>
              <div style={{ fontWeight: isCurrent ? 700 : 600, color: isCurrent ? "var(--primary)" : "#111827" }}>
                {labelForStatus(s)}
              </div>
              <div className="small" style={{ color: "#6b7280" }}>{time || "—"}</div>
            </div>
            {idx < ORDER_STATUSES.length - 1 ? (
              <div
                aria-hidden
                style={{
                  width: 32,
                  height: 2,
                  background: idx < currentIndex ? "var(--primary)" : "#e5e7eb",
                  borderRadius: 1,
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function labelForStatus(s) {
  switch (s) {
    case "PLACED":
      return "Order Placed";
    case "PACKED":
      return "Packed";
    case "OUT_FOR_DELIVERY":
      return "Out for Delivery";
    case "DELIVERED":
      return "Delivered";
    default:
      return s;
  }
}

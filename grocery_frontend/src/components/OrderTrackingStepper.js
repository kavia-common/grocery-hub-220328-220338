import React, { useMemo, useState } from "react";
import { useNotifications } from "../notifications/NotificationsContext";

const ORDER_FLOW = ["PLACED", "CONFIRMED", "OUT FOR DELIVERY", "DELIVERED"];

/**
 * PUBLIC_INTERFACE
 * OrderTrackingStepper displays a horizontal step indicator with optional local control in mock mode.
 * Props:
 * - orderId?: number | string (used for notification text)
 * - status?: string (current status; if omitted, component uses internal state for demo/mock)
 * - onAdvance?: function(nextStatus) -> void (optional callback when locally advanced)
 */
export default function OrderTrackingStepper({ orderId, status: externalStatus, onAdvance }) {
  const { notify, NotificationTypes } = useNotifications();
  const [internalStatus, setInternalStatus] = useState(externalStatus || "PLACED");
  const status = externalStatus || internalStatus;
  const currentIndex = Math.max(0, ORDER_FLOW.indexOf(status));

  const canAdvance = useMemo(() => currentIndex < ORDER_FLOW.length - 1 && !externalStatus, [currentIndex, externalStatus]);

  const advanceStatus = async () => {
    const next = ORDER_FLOW[Math.min(currentIndex + 1, ORDER_FLOW.length - 1)];
    if (!externalStatus) setInternalStatus(next);
    onAdvance && onAdvance(next);
    if (next !== status) {
      await notify({
        type: NotificationTypes.info,
        message: `Order #${orderId || "—"} is ${next}`,
        meta: { type: "order_status", orderId, status: next },
      });
    }
  };

  return (
    <div className="order-stepper" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      {ORDER_FLOW.map((s, idx) => {
        const active = idx <= currentIndex;
        const isCurrent = idx === currentIndex;
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
            <div style={{ fontWeight: isCurrent ? 700 : 600, color: isCurrent ? "var(--primary)" : "#111827" }}>
              {s}
            </div>
            {idx < ORDER_FLOW.length - 1 ? (
              <div aria-hidden style={{ width: 32, height: 2, background: idx < currentIndex ? "var(--primary)" : "#e5e7eb", borderRadius: 1 }} />
            ) : null}
          </div>
        );
      })}
      {canAdvance ? (
        <button className="btn btn-ghost" onClick={advanceStatus} style={{ marginLeft: 8 }}>
          Advance Status
        </button>
      ) : null}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import "../styles.css";
import { useNotifications } from "../notifications/NotificationsContext";

/**
 * PUBLIC_INTERFACE
 * PaymentMethodSelector allows selecting and validating a payment method and returns a normalized payload.
 * Props:
 * - onValidityChange: (isValid: boolean) => void
 * - onChange: (selection: { method: 'UPI'|'CARD'|'WALLET'|'COD', meta: object }) => void
 * - initialMethod: optional preselected method
 * - initialMeta: optional prefilled meta
 */
export default function PaymentMethodSelector({
  onValidityChange,
  onChange,
  initialMethod = null,
  initialMeta = null,
}) {
  const METHODS = ["UPI", "CARD", "WALLET", "COD"];
  const [method, setMethod] = useState(initialMethod || localStorage.getItem("lastSelectedPaymentMethod") || "COD");
  const [upiId, setUpiId] = useState(initialMeta?.upiId || "");
  const [upiName, setUpiName] = useState(initialMeta?.upiName || "");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [walletProvider, setWalletProvider] = useState(initialMeta?.walletProvider || "");
  const [validated, setValidated] = useState(false);
  const { notify, NotificationTypes } = useNotifications();

  // Masking / formatting helpers
  const maskedUpi = useMemo(() => {
    if (!upiId) return "";
    const [id, domain] = upiId.split("@");
    if (!id || !domain) return upiId;
    const visible = id.slice(0, Math.min(2, id.length));
    return `${visible}${"*".repeat(Math.max(0, id.length - visible.length))}@${domain}`;
  }, [upiId]);

  const last4 = useMemo(() => {
    const digits = (cardNumber || "").replace(/\D/g, "");
    return digits.slice(-4);
  }, [cardNumber]);

  const selection = useMemo(() => {
    switch (method) {
      case "UPI":
        return { method, meta: { upiId: upiId.trim(), upiName: upiName.trim(), masked: maskedUpi } };
      case "CARD":
        return { method, meta: { cardLast4: last4, nameOnCard: cardName.trim(), expiry: cardExpiry.trim() } };
      case "WALLET":
        return { method, meta: { walletProvider } };
      case "COD":
      default:
        return { method: "COD", meta: {} };
    }
  }, [method, upiId, upiName, maskedUpi, last4, cardName, cardExpiry, walletProvider]);

  const validateCurrent = () => {
    switch (method) {
      case "UPI": {
        const id = upiId.trim();
        // Basic UPI format: local@provider with simple char checks
        const ok = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(id);
        return ok;
      }
      case "CARD": {
        const digits = (cardNumber || "").replace(/\D/g, "");
        const cvv = (cardCvv || "").replace(/\D/g, "");
        const expiryOk = /^((0[1-9])|(1[0-2]))\/(\d{2})$/.test(cardExpiry.trim());
        return digits.length >= 12 && digits.length <= 19 && cardName.trim().length >= 2 && expiryOk && (cvv.length === 3 || cvv.length === 4);
      }
      case "WALLET":
        return ["PhonePe", "Paytm", "Google Pay", "Amazon Pay"].includes(walletProvider);
      case "COD":
        return true;
      default:
        return false;
    }
  };

  const handleValidate = () => {
    const ok = validateCurrent();
    setValidated(ok);
    if (ok) {
      notify({ type: NotificationTypes.success, message: "Payment method validated" });
      try {
        localStorage.setItem("lastSelectedPaymentMethod", method);
      } catch {}
    } else {
      notify({ type: NotificationTypes.warning, message: "Please provide valid payment details" });
    }
    onValidityChange?.(ok);
    onChange?.(selection);
  };

  useEffect(() => {
    // Reset validation when method or details change
    setValidated(false);
    onValidityChange?.(false);
    onChange?.(selection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, upiId, upiName, cardNumber, cardName, cardExpiry, cardCvv, walletProvider]);

  const tabBtn = (m) => (
    <button
      key={m}
      className="btn"
      onClick={() => setMethod(m)}
      aria-pressed={method === m}
      style={{
        background: method === m ? "var(--primary)" : "#eef2ff",
        color: method === m ? "#fff" : "#1E3A8A",
        border: "1px solid #DBEAFE",
      }}
    >
      {m}
    </button>
  );

  const sectionStyle = {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    border: "1px solid #DBEAFE",
    background: "linear-gradient(135deg, rgba(37,99,235,0.06), #ffffff)",
  };

  const inputStyle = { maxWidth: 280 };

  const onCardNumberChange = (e) => {
    // basic masking: keep digits, group 4s
    const digits = e.target.value.replace(/\D/g, "").slice(0, 19);
    const parts = digits.match(/.{1,4}/g) || [];
    setCardNumber(parts.join(" "));
  };

  const onExpiryChange = (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
    setCardExpiry(v);
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ color: "#2563EB" }}>Payment Method</strong>
        <div className="row" style={{ gap: 6 }}>
          {METHODS.map(tabBtn)}
        </div>
      </div>

      {method === "UPI" && (
        <div style={sectionStyle}>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input"
              placeholder="yourname@bank"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              style={inputStyle}
              aria-label="UPI ID"
            />
            <input
              className="input"
              placeholder="Account holder name (optional)"
              value={upiName}
              onChange={(e) => setUpiName(e.target.value)}
              style={inputStyle}
              aria-label="UPI Name"
            />
          </div>
          {upiId ? (
            <div className="small" style={{ marginTop: 6 }}>Will charge via UPI: {maskedUpi}</div>
          ) : null}
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={handleValidate}>Validate UPI</button>
            {validated ? <span className="badge ok">Ready</span> : <span className="badge">Not validated</span>}
          </div>
        </div>
      )}

      {method === "CARD" && (
        <div style={sectionStyle}>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <input
              className="input"
              placeholder="Card number"
              value={cardNumber}
              onChange={onCardNumberChange}
              style={{ ...inputStyle, minWidth: 220 }}
              aria-label="Card number"
              inputMode="numeric"
            />
            <input
              className="input"
              placeholder="Name on card"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              style={{ ...inputStyle, minWidth: 200 }}
              aria-label="Name on card"
            />
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <input
              className="input"
              placeholder="MM/YY"
              value={cardExpiry}
              onChange={onExpiryChange}
              style={{ width: 120 }}
              aria-label="Expiry"
              inputMode="numeric"
            />
            <input
              className="input"
              placeholder="CVV"
              value={cardCvv}
              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              style={{ width: 120 }}
              aria-label="CVV"
              inputMode="numeric"
            />
          </div>
          {last4 ? <div className="small" style={{ marginTop: 6 }}>We will store only last 4: **** **** **** {last4}</div> : null}
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={handleValidate}>Validate Card</button>
            {validated ? <span className="badge ok">Ready</span> : <span className="badge">Not validated</span>}
          </div>
        </div>
      )}

      {method === "WALLET" && (
        <div style={sectionStyle}>
          <select
            className="input"
            aria-label="Wallet provider"
            value={walletProvider}
            onChange={(e) => setWalletProvider(e.target.value)}
            style={{ ...inputStyle, maxWidth: 320 }}
          >
            <option value="">Select Wallet</option>
            <option value="PhonePe">PhonePe</option>
            <option value="Paytm">Paytm</option>
            <option value="Google Pay">Google Pay</option>
            <option value="Amazon Pay">Amazon Pay</option>
          </select>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={handleValidate}>Validate Wallet</button>
            {validated ? <span className="badge ok">Ready</span> : <span className="badge">Not validated</span>}
          </div>
        </div>
      )}

      {method === "COD" && (
        <div style={sectionStyle}>
          <div className="small">Pay with cash or supported methods upon delivery. No additional details required.</div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={handleValidate}>Select COD</button>
            {validated ? <span className="badge ok">Ready</span> : <span className="badge">Not selected</span>}
          </div>
        </div>
      )}
    </div>
  );
}

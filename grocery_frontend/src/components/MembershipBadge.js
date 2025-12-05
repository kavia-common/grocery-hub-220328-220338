import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentMembership, isMemberActive } from "../services/membershipsService";

/**
 * PUBLIC_INTERFACE
 * MembershipBadge shows quick status and a link to manage membership.
 */
export default function MembershipBadge() {
  const [label, setLabel] = useState("Membership");
  const [active, setActive] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [cur, act] = await Promise.all([getCurrentMembership(), isMemberActive()]);
      if (!mounted) return;
      setActive(!!act);
      setLabel(cur?.planName ? cur.planName : act ? "Member" : "Membership");
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Link to="/memberships" className="row" title="Manage membership" style={{ gap: 6 }}>
      <span className="badge" style={{
        background: active ? "#DBEAFE" : "#F3F4F6",
        color: active ? "#1E3A8A" : "#6b7280"
      }}>
        {active ? "Member" : "Join"}
      </span>
      <span style={{ color: "#2563EB", fontWeight: 600 }}>{label}</span>
    </Link>
  );
}

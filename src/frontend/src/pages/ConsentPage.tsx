import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { type SessionOutput, SessionStatus } from "../backend";
import GlassCard from "../components/GlassCard";
import { useBackend } from "../hooks/useBackend";

type PageState =
  | "loading"
  | "not-found"
  | "expired"
  | "completed"
  | "ready"
  | "sharing"
  | "shared"
  | "denied"
  | "geo-error";

function TrustChecklist() {
  const items = [
    "Your location will be accessed once only",
    "Data is stored for max 30 minutes then deleted",
    "No continuous background tracking",
    "You can deny this request at any time",
  ];

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(34,211,238,0.05)",
        border: "1px solid rgba(34,211,238,0.15)",
      }}
    >
      <div className="space-y-2">
        {items.map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.07 }}
            className="flex items-start gap-2.5"
          >
            <span
              className="mt-0.5 flex-shrink-0 text-sm"
              style={{ color: "#22D3EE" }}
            >
              ✔
            </span>
            <span
              className="text-xs leading-relaxed"
              style={{ color: "#9AA9BC" }}
            >
              {item}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function ConsentPage() {
  const { id } = useParams<{ id: string }>();
  const { actor, isFetching } = useBackend();
  const [state, setState] = useState<PageState>("loading");
  const [session, setSession] = useState<SessionOutput | null>(null);
  const [geoError, setGeoError] = useState("");

  useEffect(() => {
    if (!id) {
      setState("not-found");
      return;
    }
    if (isFetching || !actor) {
      setState("loading");
      return;
    }

    let cancelled = false;

    async function checkSession() {
      try {
        const s = await actor!.getSession(id!);
        if (cancelled) return;
        if (!s) {
          setState("not-found");
          return;
        }
        setSession(s);
        if (s.status === SessionStatus.expired) {
          setState("expired");
        } else if (s.status === SessionStatus.completed) {
          setState("completed");
        } else {
          setState("ready");
        }
      } catch {
        if (!cancelled) setState("not-found");
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, [id, actor, isFetching]);

  async function handleAllow() {
    setState("sharing");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const result = await actor!.submitLocation(
            id!,
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.accuracy,
          );
          if (result) {
            setState("shared");
          } else {
            setGeoError(
              "The server rejected the location submission. The session may have expired.",
            );
            setState("geo-error");
          }
        } catch (err) {
          console.error("submitLocation error:", err);
          setGeoError(
            "Failed to submit location to the server. Please try again.",
          );
          setState("geo-error");
        }
      },
      (err) => {
        let msg = "An unknown error occurred while getting your location.";
        if (err.code === 1) {
          msg =
            "Location access denied. Please allow location permission in your browser settings and try again.";
        } else if (err.code === 2) {
          msg =
            "Unable to determine your location. Please check your GPS/network connection and try again.";
        } else if (err.code === 3) {
          msg =
            "Location request timed out. Please try again in a better signal area.";
        }
        setGeoError(msg);
        setState("geo-error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  function handleDeny() {
    setState("denied");
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6 py-12"
      style={{ background: "#0B1220" }}
    >
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {/* LOADING */}
          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard
                className="text-center"
                data-ocid="consent.loading_state"
              >
                <div
                  className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2"
                  style={{
                    borderColor: "rgba(34,211,238,0.2)",
                    borderTopColor: "#22D3EE",
                  }}
                />
                <p style={{ color: "#9AA9BC" }}>Verifying request…</p>
              </GlassCard>
            </motion.div>
          )}

          {/* NOT FOUND */}
          {state === "not-found" && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard
                className="text-center"
                data-ocid="consent.error_state"
              >
                <div className="mb-4 text-5xl">🚫</div>
                <h2
                  className="mb-2 text-xl font-bold"
                  style={{ color: "#EAF2FF" }}
                >
                  Request Not Found
                </h2>
                <p className="text-sm" style={{ color: "#9AA9BC" }}>
                  This location request could not be found. The link may be
                  invalid or already used.
                </p>
              </GlassCard>
            </motion.div>
          )}

          {/* EXPIRED */}
          {state === "expired" && (
            <motion.div
              key="expired"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard
                className="text-center"
                data-ocid="consent.error_state"
              >
                <div className="mb-4 text-5xl">⏰</div>
                <h2
                  className="mb-2 text-xl font-bold"
                  style={{ color: "#EAF2FF" }}
                >
                  Session Expired
                </h2>
                <p className="text-sm" style={{ color: "#9AA9BC" }}>
                  This tracking session has expired or been deactivated. Please
                  ask for a new link.
                </p>
              </GlassCard>
            </motion.div>
          )}

          {/* COMPLETED */}
          {state === "completed" && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard className="text-center">
                <div className="mb-4 text-5xl">✅</div>
                <h2
                  className="mb-2 text-xl font-bold"
                  style={{ color: "#EAF2FF" }}
                >
                  Location Already Shared
                </h2>
                <p className="text-sm" style={{ color: "#9AA9BC" }}>
                  Your location has already been submitted for this request.
                  This link is now inactive.
                </p>
              </GlassCard>
            </motion.div>
          )}

          {/* READY — Main consent form */}
          {state === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard>
                {/* Secure label */}
                <div className="mb-5 flex items-center justify-center">
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: "rgba(34,211,238,0.1)",
                      border: "1px solid rgba(34,211,238,0.25)",
                      color: "#22D3EE",
                    }}
                  >
                    🛡️ Secure & Consent-Based
                  </span>
                </div>

                {/* Requester info — transparent */}
                {session && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-5 rounded-xl p-4 text-center"
                    style={{
                      background: "rgba(18,28,44,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <p
                      className="mb-1 text-base font-bold"
                      style={{ color: "#EAF2FF" }}
                    >
                      <span style={{ color: "#22D3EE" }}>
                        {session.requesterName}
                      </span>{" "}
                      has requested your location
                    </p>
                    <p className="text-sm" style={{ color: "#9AA9BC" }}>
                      Reason:{" "}
                      <span
                        className="font-medium"
                        style={{ color: "#EAF2FF" }}
                      >
                        {session.reason}
                      </span>
                    </p>
                  </motion.div>
                )}

                {/* Trust checklist */}
                <div className="mb-5">
                  <TrustChecklist />
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAllow}
                    className="cyan-btn neon-glow w-full py-3.5 text-sm font-bold"
                    data-ocid="consent.confirm_button"
                  >
                    ✅ Allow Location Access
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDeny}
                    className="w-full rounded-full border py-3.5 text-sm font-semibold transition-colors"
                    style={{
                      borderColor: "rgba(120,140,165,0.3)",
                      color: "#9AA9BC",
                    }}
                    data-ocid="consent.cancel_button"
                  >
                    Deny
                  </motion.button>
                </div>

                {/* Privacy note */}
                <p
                  className="mt-4 text-center text-xs"
                  style={{ color: "#9AA9BC" }}
                >
                  Compliant with India DPDP Act 2023 ·{" "}
                  <a href="/privacy" className="underline hover:text-[#22D3EE]">
                    Privacy Policy
                  </a>
                </p>
              </GlassCard>
            </motion.div>
          )}

          {/* SHARING */}
          {state === "sharing" && (
            <motion.div
              key="sharing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard
                className="text-center"
                data-ocid="consent.loading_state"
              >
                <div
                  className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2"
                  style={{
                    borderColor: "rgba(34,211,238,0.2)",
                    borderTopColor: "#22D3EE",
                  }}
                />
                <p style={{ color: "#EAF2FF" }}>Getting your location…</p>
                <p className="mt-1 text-xs" style={{ color: "#9AA9BC" }}>
                  Please allow location access in your browser if prompted.
                </p>
              </GlassCard>
            </motion.div>
          )}

          {/* SHARED */}
          {state === "shared" && (
            <motion.div
              key="shared"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard
                className="text-center"
                data-ocid="consent.success_state"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="mb-4 text-5xl"
                >
                  🎉
                </motion.div>
                <h2
                  className="mb-2 text-xl font-bold"
                  style={{ color: "#22D3EE" }}
                >
                  Location Shared Successfully
                </h2>
                <p className="mb-4 text-sm" style={{ color: "#9AA9BC" }}>
                  Your location has been shared. You may safely close this page.
                </p>
                <div
                  className="rounded-xl p-3 text-xs"
                  style={{
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    color: "#86EFAC",
                  }}
                >
                  ✔ Data will be automatically deleted after 30 minutes
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* DENIED */}
          {state === "denied" && (
            <motion.div
              key="denied"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard className="text-center">
                <div className="mb-4 text-5xl">🚫</div>
                <h2
                  className="mb-2 text-xl font-bold"
                  style={{ color: "#EAF2FF" }}
                >
                  Request Denied
                </h2>
                <p className="text-sm" style={{ color: "#9AA9BC" }}>
                  You have denied the location request. You can safely close
                  this page.
                </p>
              </GlassCard>
            </motion.div>
          )}

          {/* GEO ERROR */}
          {state === "geo-error" && (
            <motion.div
              key="geo-error"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard data-ocid="consent.error_state">
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <h2
                    className="text-lg font-bold"
                    style={{ color: "#FCA5A5" }}
                  >
                    Location Error
                  </h2>
                </div>
                <p
                  className="mb-5 text-sm leading-relaxed"
                  style={{ color: "#9AA9BC" }}
                >
                  {geoError}
                </p>
                <div
                  className="mb-4 rounded-xl p-3 text-xs"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#FCA5A5",
                  }}
                >
                  💡 Tip: Check browser address bar → click the lock/info icon →
                  allow Location.
                </div>
                <button
                  type="button"
                  onClick={() => setState("ready")}
                  className="text-sm font-medium"
                  style={{ color: "#22D3EE" }}
                >
                  ← Try again
                </button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

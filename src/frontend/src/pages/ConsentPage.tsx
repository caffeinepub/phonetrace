import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import { useBackend } from "../hooks/useBackend";

type PageState =
  | "loading"
  | "actor-loading"
  | "not-found"
  | "expired"
  | "consent-given"
  | "denied"
  | "ready"
  | "sharing"
  | "shared"
  | "geo-error";

export default function ConsentPage() {
  const { id } = useParams<{ id: string }>();
  const { actor, isFetching } = useBackend();
  const [state, setState] = useState<PageState>("loading");
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
        const session = await actor!.getSession(id!);
        if (cancelled) return;
        if (!session) {
          setState("not-found");
          return;
        }
        if (!session.isActive) {
          setState("expired");
          return;
        }
        if (session.consentGiven) {
          setState("consent-given");
          return;
        }
        setState("ready");
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
          await actor!.submitLocation(
            id!,
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.accuracy,
          );
          setState("shared");
        } catch {
          setGeoError("Failed to submit location. Please try again.");
          setState("geo-error");
        }
      },
      (err) => {
        setGeoError(
          err.code === 1
            ? "Location access denied. Please allow location permission in your browser settings."
            : err.code === 2
              ? "Unable to determine your location. Please try again."
              : "Location request timed out. Please try again.",
        );
        setState("geo-error");
      },
      { enableHighAccuracy: true, timeout: 10000 },
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
          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard className="text-center">
                <div
                  className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2"
                  style={{
                    borderColor: "rgba(34,211,238,0.2)",
                    borderTopColor: "#22D3EE",
                  }}
                  data-ocid="consent.loading_state"
                />
                <p style={{ color: "#9AA9BC" }}>Verifying request…</p>
              </GlassCard>
            </motion.div>
          )}

          {(state === "not-found" || state === "expired") && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard className="text-center">
                <div className="mb-4 text-5xl" data-ocid="consent.error_state">
                  {state === "expired" ? "⏰" : "🚫"}
                </div>
                <h2
                  className="mb-2 text-xl font-bold"
                  style={{ color: "#EAF2FF" }}
                >
                  {state === "expired"
                    ? "Session Expired"
                    : "Request Not Found"}
                </h2>
                <p className="text-sm" style={{ color: "#9AA9BC" }}>
                  {state === "expired"
                    ? "This tracking session has expired or been deactivated. Please ask for a new link."
                    : "This location request could not be found. The link may be invalid or already used."}
                </p>
              </GlassCard>
            </motion.div>
          )}

          {state === "consent-given" && (
            <motion.div
              key="already"
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
                </p>
              </GlassCard>
            </motion.div>
          )}

          {state === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard>
                <div className="mb-6 text-center">
                  <div
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
                    style={{
                      background: "rgba(34,211,238,0.1)",
                      border: "1px solid rgba(34,211,238,0.3)",
                    }}
                  >
                    📍
                  </div>
                  <h2
                    className="mb-3 text-2xl font-bold"
                    style={{ color: "#EAF2FF" }}
                  >
                    Location Request
                  </h2>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#9AA9BC" }}
                  >
                    Someone has requested your location for tracking purposes.
                    You have the right to approve or deny this request.
                  </p>
                </div>

                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAllow}
                    className="cyan-btn neon-glow w-full py-3.5 text-sm font-bold"
                    data-ocid="consent.confirm_button"
                  >
                    Allow Location Access
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

                <div
                  className="mt-6 rounded-xl p-4"
                  style={{
                    background: "rgba(34,211,238,0.04)",
                    border: "1px solid rgba(34,211,238,0.15)",
                  }}
                >
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "#9AA9BC" }}
                  >
                    🔒 Your location data is stored temporarily (30 minutes) and
                    will be automatically deleted. This system complies with
                    India DPDP Act 2023 and global privacy standards.
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          )}

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
                  Please allow location access in your browser.
                </p>
              </GlassCard>
            </motion.div>
          )}

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
                <div className="mb-4 text-5xl">🎉</div>
                <h2
                  className="mb-2 text-xl font-bold"
                  style={{ color: "#22D3EE" }}
                >
                  Location Shared Successfully
                </h2>
                <p className="text-sm" style={{ color: "#9AA9BC" }}>
                  Your location has been shared. You may safely close this page.
                </p>
              </GlassCard>
            </motion.div>
          )}

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
                  You have denied the location request. You can close this page.
                </p>
              </GlassCard>
            </motion.div>
          )}

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
                <p className="mb-4 text-sm" style={{ color: "#9AA9BC" }}>
                  {geoError}
                </p>
                <button
                  type="button"
                  onClick={() => setState("ready")}
                  className="text-sm"
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

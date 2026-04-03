import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import Navbar from "../components/Navbar";
import { useBackend } from "../hooks/useBackend";

export default function RequestPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const phone = searchParams.get("phone") || "";
  const { actor, isFetching } = useBackend();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!phone) {
      navigate("/");
      return;
    }
    if (isFetching || !actor) return;

    let cancelled = false;
    async function createSession() {
      try {
        const id = await actor!.createSession(phone);
        if (!cancelled) setSessionId(id);
      } catch {
        if (!cancelled)
          setError("Failed to create tracking session. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    createSession();
    return () => {
      cancelled = true;
    };
  }, [phone, navigate, actor, isFetching]);

  const shareLink = sessionId
    ? `${window.location.origin}/track/${sessionId}`
    : "";

  async function handleCopy() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen" style={{ background: "#0B1220" }}>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="mb-2 text-3xl font-bold" style={{ color: "#EAF2FF" }}>
            Location Request Created
          </h1>
          <p className="mb-8 text-sm" style={{ color: "#9AA9BC" }}>
            Share this link with the recipient. They must click Allow to share
            their location.
          </p>

          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <GlassCard>
                  <div
                    className="flex items-center gap-4"
                    data-ocid="request.loading_state"
                  >
                    <div
                      className="h-8 w-8 animate-spin rounded-full border-2"
                      style={{
                        borderColor: "rgba(34,211,238,0.2)",
                        borderTopColor: "#22D3EE",
                      }}
                    />
                    <p style={{ color: "#9AA9BC" }}>
                      Creating your tracking session…
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {!loading && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <GlassCard>
                  <div
                    className="flex items-center gap-3"
                    data-ocid="request.error_state"
                  >
                    <span className="text-xl">❌</span>
                    <div>
                      <p className="font-semibold" style={{ color: "#FCA5A5" }}>
                        Error
                      </p>
                      <p className="text-sm" style={{ color: "#9AA9BC" }}>
                        {error}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/"
                    className="mt-4 inline-block text-sm"
                    style={{ color: "#22D3EE" }}
                  >
                    ← Go back
                  </Link>
                </GlassCard>
              </motion.div>
            )}

            {!loading && sessionId && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Phone display */}
                <GlassCard>
                  <p className="mb-1 text-xs" style={{ color: "#9AA9BC" }}>
                    Target Number
                  </p>
                  <p
                    className="text-xl font-semibold"
                    style={{ color: "#EAF2FF" }}
                  >
                    +91 {phone}
                  </p>
                </GlassCard>

                {/* Share link */}
                <GlassCard>
                  <p className="mb-2 text-xs" style={{ color: "#9AA9BC" }}>
                    Shareable Consent Link
                  </p>
                  <div
                    className="break-all rounded-xl p-3 font-mono text-xs"
                    style={{
                      background: "rgba(34,211,238,0.05)",
                      color: "#22D3EE",
                      border: "1px solid rgba(34,211,238,0.2)",
                    }}
                    data-ocid="request.panel"
                  >
                    {shareLink}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleCopy}
                      className="cyan-btn px-5 py-2.5 text-sm"
                      data-ocid="request.primary_button"
                    >
                      {copied ? "✓ Copied!" : "Copy Link"}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(`/dashboard/${sessionId}`)}
                      className="rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors hover:border-[#22D3EE] hover:text-[#22D3EE]"
                      style={{
                        borderColor: "rgba(120,140,165,0.4)",
                        color: "#9AA9BC",
                      }}
                      data-ocid="request.secondary_button"
                    >
                      View Dashboard
                    </motion.button>
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="flex items-start gap-3">
                    <span className="text-lg">ℹ️</span>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#9AA9BC" }}
                    >
                      Share this link manually via WhatsApp, SMS, or email. The
                      recipient must click
                      <strong style={{ color: "#EAF2FF" }}>
                        {" "}
                        Allow Location Access{" "}
                      </strong>
                      for their GPS coordinates to be shared with you.
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import Navbar from "../components/Navbar";
import { useBackend } from "../hooks/useBackend";

// Rate limit: max 3 requests per 10 minutes
const RATE_LIMIT_KEY = "pt_rate_limit";
const HISTORY_KEY = "pt_history";
const MAX_REQUESTS = 3;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

interface RateLimit {
  count: number;
  windowStart: number;
}

interface HistoryEntry {
  id: string;
  number: string;
  requesterName: string;
  reason: string;
  status: "pending" | "completed" | "expired";
  createdAt: string;
}

function checkRateLimit(): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const raw = localStorage.getItem(RATE_LIMIT_KEY);
  const now = Date.now();
  let rl: RateLimit = raw ? JSON.parse(raw) : { count: 0, windowStart: now };

  if (now - rl.windowStart > WINDOW_MS) {
    rl = { count: 0, windowStart: now };
  }

  const remaining = MAX_REQUESTS - rl.count;
  const resetIn = Math.ceil((rl.windowStart + WINDOW_MS - now) / 1000);
  return { allowed: remaining > 0, remaining, resetIn };
}

function incrementRateLimit() {
  const raw = localStorage.getItem(RATE_LIMIT_KEY);
  const now = Date.now();
  let rl: RateLimit = raw ? JSON.parse(raw) : { count: 0, windowStart: now };
  if (now - rl.windowStart > WINDOW_MS) {
    rl = { count: 0, windowStart: now };
  }
  rl.count += 1;
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(rl));
}

function saveToHistory(entry: HistoryEntry) {
  const raw = localStorage.getItem(HISTORY_KEY);
  const history: HistoryEntry[] = raw ? JSON.parse(raw) : [];
  history.unshift(entry);
  if (history.length > 20) history.splice(20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function getHistory(): HistoryEntry[] {
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

function StatusBadge({ status }: { status: HistoryEntry["status"] }) {
  const styles: Record<
    HistoryEntry["status"],
    { bg: string; color: string; border: string; dot: string }
  > = {
    pending: {
      bg: "rgba(234,179,8,0.12)",
      color: "#FDE047",
      border: "1px solid rgba(234,179,8,0.35)",
      dot: "#FDE047",
    },
    completed: {
      bg: "rgba(34,197,94,0.12)",
      color: "#86EFAC",
      border: "1px solid rgba(34,197,94,0.35)",
      dot: "#86EFAC",
    },
    expired: {
      bg: "rgba(239,68,68,0.12)",
      color: "#FCA5A5",
      border: "1px solid rgba(239,68,68,0.35)",
      dot: "#FCA5A5",
    },
  };
  const s = styles[status];
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: s.bg, color: s.color, border: s.border }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: s.dot }}
      />
      {label}
    </span>
  );
}

type PageState = "form" | "submitting" | "success" | "rate-limited" | "error";

export default function RequestPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const phone = searchParams.get("phone") || "";
  const { actor, isFetching } = useBackend();

  const [pageState, setPageState] = useState<PageState>("form");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(getHistory);

  // Form fields
  const [requesterName, setRequesterName] = useState("");
  const [reason, setReason] = useState("");
  const [nameError, setNameError] = useState("");
  const [reasonError, setReasonError] = useState("");

  if (!phone) {
    navigate("/");
    return null;
  }

  function validate(): boolean {
    let valid = true;
    if (requesterName.trim().length < 3) {
      setNameError("Name must be at least 3 characters.");
      valid = false;
    } else {
      setNameError("");
    }
    if (reason.trim().length < 5) {
      setReasonError("Reason must be at least 5 characters.");
      valid = false;
    } else {
      setReasonError("");
    }
    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const rl = checkRateLimit();
    if (!rl.allowed) {
      setPageState("rate-limited");
      return;
    }

    if (isFetching || !actor) {
      setError("Backend is loading. Please wait a moment and try again.");
      setPageState("error");
      return;
    }

    setPageState("submitting");
    try {
      const id = await actor.createSession(
        phone,
        requesterName.trim(),
        reason.trim(),
      );
      incrementRateLimit();
      const entry: HistoryEntry = {
        id,
        number: phone,
        requesterName: requesterName.trim(),
        reason: reason.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      saveToHistory(entry);
      setHistory(getHistory());
      setSessionId(id);
      setPageState("success");
    } catch {
      setError("Failed to create tracking session. Please try again.");
      setPageState("error");
    }
  }

  const shareLink = sessionId
    ? `${window.location.origin}/track/${sessionId}`
    : "";

  async function handleCopy() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const rl = checkRateLimit();

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
            Request Location
          </h1>
          <p className="mb-8 text-sm" style={{ color: "#9AA9BC" }}>
            Fill in your details. The recipient will see this information before
            sharing their location.
          </p>

          <AnimatePresence mode="wait">
            {/* FORM STATE */}
            {pageState === "form" && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <GlassCard>
                  {/* Phone display */}
                  <div className="mb-5">
                    <p
                      className="mb-1 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#9AA9BC" }}
                    >
                      Target Number
                    </p>
                    <p
                      className="text-lg font-semibold"
                      style={{ color: "#EAF2FF" }}
                    >
                      +91 {phone}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Requester Name */}
                    <div>
                      <label
                        htmlFor="requesterName"
                        className="mb-1.5 block text-sm font-semibold"
                        style={{ color: "#EAF2FF" }}
                      >
                        Your Name / Organization
                        <span style={{ color: "#FCA5A5" }}> *</span>
                      </label>
                      <input
                        id="requesterName"
                        type="text"
                        value={requesterName}
                        onChange={(e) => {
                          setRequesterName(e.target.value);
                          if (e.target.value.trim().length >= 3)
                            setNameError("");
                        }}
                        placeholder="e.g. DSP Sharma, City Police Department"
                        className="w-full rounded-xl px-4 py-3 text-sm transition-all outline-none focus:ring-2"
                        style={{
                          background: "rgba(34,211,238,0.05)",
                          border: nameError
                            ? "1px solid rgba(239,68,68,0.5)"
                            : "1px solid rgba(34,211,238,0.2)",
                          color: "#EAF2FF",
                        }}
                        data-ocid="request.input"
                        autoComplete="name"
                      />
                      {nameError && (
                        <p
                          className="mt-1.5 text-xs"
                          style={{ color: "#FCA5A5" }}
                          data-ocid="request.error_state"
                        >
                          {nameError}
                        </p>
                      )}
                    </div>

                    {/* Reason */}
                    <div>
                      <label
                        htmlFor="reason"
                        className="mb-1.5 block text-sm font-semibold"
                        style={{ color: "#EAF2FF" }}
                      >
                        Reason for Request
                        <span style={{ color: "#FCA5A5" }}> *</span>
                      </label>
                      <input
                        id="reason"
                        type="text"
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          if (e.target.value.trim().length >= 5)
                            setReasonError("");
                        }}
                        placeholder="e.g. Safety verification, Emergency contact, Field verification"
                        className="w-full rounded-xl px-4 py-3 text-sm transition-all outline-none focus:ring-2"
                        style={{
                          background: "rgba(34,211,238,0.05)",
                          border: reasonError
                            ? "1px solid rgba(239,68,68,0.5)"
                            : "1px solid rgba(34,211,238,0.2)",
                          color: "#EAF2FF",
                        }}
                        data-ocid="request.textarea"
                        autoComplete="off"
                      />
                      {reasonError && (
                        <p
                          className="mt-1.5 text-xs"
                          style={{ color: "#FCA5A5" }}
                          data-ocid="request.error_state"
                        >
                          {reasonError}
                        </p>
                      )}
                    </div>

                    {/* Rate limit info */}
                    {rl.remaining <= 1 && rl.remaining > 0 && (
                      <div
                        className="rounded-xl p-3 text-xs"
                        style={{
                          background: "rgba(234,179,8,0.08)",
                          border: "1px solid rgba(234,179,8,0.25)",
                          color: "#FDE047",
                        }}
                      >
                        ⚠️ You have {rl.remaining} request
                        {rl.remaining === 1 ? "" : "s"} remaining in this
                        10-minute window.
                      </div>
                    )}

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="cyan-btn neon-glow w-full py-3.5 text-sm font-bold"
                      data-ocid="request.submit_button"
                    >
                      Create Location Request
                    </motion.button>
                  </form>
                </GlassCard>

                <GlassCard>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-base">🔒</span>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "#9AA9BC" }}
                    >
                      Your name and reason will be shown to the recipient.
                      Location is only captured after their explicit consent.
                      Compliant with India DPDP Act 2023.
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* SUBMITTING STATE */}
            {pageState === "submitting" && (
              <motion.div
                key="submitting"
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

            {/* ERROR STATE */}
            {pageState === "error" && (
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
                  <button
                    type="button"
                    onClick={() => setPageState("form")}
                    className="mt-4 text-sm"
                    style={{ color: "#22D3EE" }}
                    data-ocid="request.secondary_button"
                  >
                    ← Try again
                  </button>
                </GlassCard>
              </motion.div>
            )}

            {/* RATE LIMITED STATE */}
            {pageState === "rate-limited" && (
              <motion.div
                key="rate-limited"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <GlassCard data-ocid="request.error_state">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-2xl">⏱️</span>
                    <div>
                      <h3 className="font-bold" style={{ color: "#FDE047" }}>
                        Rate Limit Reached
                      </h3>
                      <p className="text-sm" style={{ color: "#9AA9BC" }}>
                        You've made {MAX_REQUESTS} requests in 10 minutes.
                        Please wait before creating a new request.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPageState("form")}
                    className="text-sm"
                    style={{ color: "#22D3EE" }}
                  >
                    ← Go back
                  </button>
                </GlassCard>
              </motion.div>
            )}

            {/* SUCCESS STATE */}
            {pageState === "success" && sessionId && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <GlassCard data-ocid="request.success_state">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    <h3 className="font-bold" style={{ color: "#86EFAC" }}>
                      Session Created!
                    </h3>
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "#9AA9BC" }}>
                        Requester:
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: "#EAF2FF" }}
                      >
                        {requesterName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "#9AA9BC" }}>
                        Reason:
                      </span>
                      <span className="text-sm" style={{ color: "#EAF2FF" }}>
                        {reason}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "#9AA9BC" }}>
                        Phone:
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: "#EAF2FF" }}
                      >
                        +91 {phone}
                      </span>
                    </div>
                  </div>

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
                      Share this link via WhatsApp, SMS, or email. The recipient
                      will see your name and reason before deciding to share
                      their location.
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Requests History */}
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <h2
                className="mb-3 text-sm font-semibold uppercase tracking-wider"
                style={{ color: "#9AA9BC" }}
              >
                Recent Requests
              </h2>
              <GlassCard className="!p-0 overflow-hidden">
                <div
                  className="divide-y"
                  style={{ borderColor: "rgba(255,255,255,0.07)" }}
                >
                  {history.map((entry, idx) => (
                    <motion.button
                      key={entry.id}
                      type="button"
                      whileHover={{ backgroundColor: "rgba(34,211,238,0.04)" }}
                      onClick={() => navigate(`/dashboard/${entry.id}`)}
                      className="w-full px-5 py-3.5 text-left transition-colors"
                      data-ocid={`request.item.${idx + 1}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm font-medium"
                              style={{ color: "#EAF2FF" }}
                            >
                              +91 {entry.number}
                            </span>
                            <StatusBadge status={entry.status} />
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span
                              className="truncate text-xs"
                              style={{ color: "#9AA9BC" }}
                            >
                              {entry.requesterName} · {entry.reason}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs" style={{ color: "#9AA9BC" }}>
                            {new Date(entry.createdAt).toLocaleTimeString(
                              "en-IN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          <div className="mt-4 text-center">
            <Link
              to="/"
              className="text-sm transition-colors hover:text-[#22D3EE]"
              style={{ color: "#9AA9BC" }}
            >
              ← Back to Home
            </Link>
          </div>
        </motion.div>
      </main>

      <footer
        className="mt-12 border-t border-white/5 py-8 text-center text-xs"
        style={{ color: "#9AA9BC" }}
      >
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-[#22D3EE]"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}

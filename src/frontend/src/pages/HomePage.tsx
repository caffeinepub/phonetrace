import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard";
import Navbar from "../components/Navbar";
import OperatorBadge from "../components/OperatorBadge";
import { telecomPrefixes } from "../data/telecom-prefixes";

type LookupResult =
  | { type: "found"; operator: string; circle: string; number: string }
  | { type: "valid"; number: string }
  | { type: "invalid" };

const workflowSteps = [
  {
    icon: "🔍",
    title: "1. Lookup Number",
    desc: "Enter any Indian mobile number to instantly identify the telecom operator and geographic circle.",
  },
  {
    icon: "🔗",
    title: "2. Send Request",
    desc: "Generate a unique consent link and share it manually with the person whose location you need.",
  },
  {
    icon: "📍",
    title: "3. Track Location",
    desc: "Once the user approves the request, view their real-time GPS location on a live interactive map.",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [searched, setSearched] = useState(false);

  function handleSearch() {
    const cleaned = phone.replace(/\s+/g, "").replace(/^\+91/, "");
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setResult({ type: "invalid" });
      setSearched(true);
      return;
    }
    const prefix = cleaned.slice(0, 4);
    const info = telecomPrefixes[prefix];
    if (info) {
      setResult({
        type: "found",
        operator: info.operator,
        circle: info.circle,
        number: cleaned,
      });
    } else {
      setResult({ type: "valid", number: cleaned });
    }
    setSearched(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  return (
    <div className="min-h-screen" style={{ background: "#0B1220" }}>
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span
            className="mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase"
            style={{
              background: "rgba(34,211,238,0.1)",
              color: "#22D3EE",
              border: "1px solid rgba(34,211,238,0.3)",
            }}
          >
            Consent-Based · Legal · Secure
          </span>
          <h1
            className="mt-4 mb-6 text-5xl font-extrabold leading-tight md:text-6xl"
            style={{ color: "#EAF2FF" }}
          >
            Intelligent Number Data &amp;
            <br />
            <span style={{ color: "#22D3EE" }}>Consent-Based Location</span>
          </h1>
          <p
            className="mx-auto max-w-2xl text-base leading-relaxed"
            style={{ color: "#9AA9BC" }}
          >
            Lookup Indian telecom operator &amp; circle instantly. Request
            location consent, then track in real-time on an interactive map —
            all with full user approval.
          </p>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mx-auto mt-10 max-w-xl"
        >
          <div
            className="flex items-center gap-2 rounded-full p-2"
            style={{
              background: "rgba(18,28,44,0.8)",
              border: "1px solid rgba(120,140,165,0.25)",
            }}
          >
            <span
              className="flex-shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold"
              style={{ background: "rgba(34,211,238,0.1)", color: "#22D3EE" }}
            >
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="Enter 10-digit mobile number"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "#EAF2FF" }}
              data-ocid="home.input"
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSearch}
              className="cyan-btn flex-shrink-0 px-6 py-2.5 text-sm"
              data-ocid="home.primary_button"
            >
              Search
            </motion.button>
          </div>
        </motion.div>

        {/* Result card */}
        <AnimatePresence mode="wait">
          {searched && result && (
            <motion.div
              key={JSON.stringify(result)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="mx-auto mt-6 max-w-xl text-left"
            >
              {result.type === "invalid" && (
                <GlassCard>
                  <div
                    className="flex items-center gap-3"
                    data-ocid="home.error_state"
                  >
                    <span className="text-xl">❌</span>
                    <div>
                      <p className="font-semibold" style={{ color: "#FCA5A5" }}>
                        Invalid Number
                      </p>
                      <p className="text-sm" style={{ color: "#9AA9BC" }}>
                        Please enter a valid 10-digit Indian mobile number
                        starting with 6, 7, 8, or 9.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              )}

              {result.type === "valid" && (
                <GlassCard>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">✅</span>
                      <div>
                        <p
                          className="font-semibold"
                          style={{ color: "#EAF2FF" }}
                        >
                          Valid Number
                        </p>
                        <p className="text-sm" style={{ color: "#9AA9BC" }}>
                          +91 {result.number} — Number format valid. Operator
                          info unavailable for this prefix.
                        </p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() =>
                        navigate(`/request?phone=${result.number}`)
                      }
                      className="cyan-btn flex-shrink-0 px-4 py-2 text-xs"
                      data-ocid="home.secondary_button"
                    >
                      Request Location
                    </motion.button>
                  </div>
                </GlassCard>
              )}

              {result.type === "found" && (
                <GlassCard>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📱</span>
                        <span
                          className="font-semibold text-lg"
                          style={{ color: "#EAF2FF" }}
                        >
                          +91 {result.number}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm" style={{ color: "#9AA9BC" }}>
                          Operator:
                        </span>
                        <OperatorBadge operator={result.operator} />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm" style={{ color: "#9AA9BC" }}>
                          Circle:
                        </span>
                        <span
                          className="rounded-full px-3 py-0.5 text-xs font-medium"
                          style={{
                            background: "rgba(31,214,199,0.1)",
                            color: "#1FD6C7",
                            border: "1px solid rgba(31,214,199,0.3)",
                          }}
                        >
                          {result.circle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            background: "#22D3EE",
                            boxShadow: "0 0 6px rgba(34,211,238,0.6)",
                          }}
                        />
                        <span className="text-xs" style={{ color: "#9AA9BC" }}>
                          Valid Indian mobile number
                        </span>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() =>
                        navigate(`/request?phone=${result.number}`)
                      }
                      className="cyan-btn px-5 py-2.5 text-sm"
                      data-ocid="home.secondary_button"
                    >
                      Request Location
                    </motion.button>
                  </div>
                </GlassCard>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center text-3xl font-bold"
          style={{ color: "#EAF2FF" }}
        >
          How It Works
        </motion.h2>
        <div className="grid gap-6 md:grid-cols-3">
          {workflowSteps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: -4 }}
            >
              <GlassCard className="h-full transition-colors hover:border-[rgba(34,211,238,0.3)]">
                <div className="mb-4 text-4xl">{step.icon}</div>
                <h3
                  className="mb-2 text-lg font-semibold"
                  style={{ color: "#EAF2FF" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#9AA9BC" }}
                >
                  {step.desc}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Legal disclaimer */}
      <div className="mx-auto max-w-6xl px-6 pb-12 text-center">
        <p className="text-xs" style={{ color: "#9AA9BC" }}>
          ⚠️ This system requires explicit user consent. No location is tracked
          without permission. Complies with India DPDP Act 2023.
        </p>
      </div>

      {/* Footer */}
      <footer
        className="border-t border-white/5 py-8 text-center text-xs"
        style={{ color: "#9AA9BC" }}
      >
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#22D3EE] transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}

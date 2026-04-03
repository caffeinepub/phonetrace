import { motion } from "motion/react";
import GlassCard from "../components/GlassCard";
import Navbar from "../components/Navbar";

const sections = [
  {
    icon: "📊",
    title: "Data Collection",
    content:
      "PhoneTrace only collects GPS coordinates (latitude, longitude, accuracy) after receiving explicit user consent. Telecom prefix lookups are performed entirely client-side using a locally cached dataset — no phone numbers are transmitted to any server during lookup.",
  },
  {
    icon: "✅",
    title: "Consent Policy",
    content:
      'No location tracking occurs without the target user\'s active approval. Every tracking session generates a unique, time-limited consent link. Users must explicitly click "Allow Location Access" in their browser. The system records consent before any data is stored.',
  },
  {
    icon: "⏱️",
    title: "Data Retention",
    content:
      "All tracking sessions and associated location data automatically expire and are deleted after 30 minutes. No historical location data is retained beyond this window. You may also deactivate a session manually at any time from the dashboard.",
  },
  {
    icon: "⚖️",
    title: "Legal Basis",
    content:
      "This platform operates in compliance with India's Digital Personal Data Protection Act 2023 (DPDP Act), the EU General Data Protection Regulation (GDPR), and applicable global privacy frameworks. All data processing is based on explicit user consent.",
  },
  {
    icon: "🔐",
    title: "User Rights",
    content:
      "You have the right to deny any location request at any time. You may withdraw consent by closing the consent page without approving. Session initiators may stop tracking at any time from the dashboard. No data is shared with third parties.",
  },
  {
    icon: "📧",
    title: "Contact",
    content:
      "For privacy inquiries, data deletion requests, or compliance concerns, contact us at: contact@phonetrace.app",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "#0B1220" }}>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-10 text-center">
            <span
              className="mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
              style={{
                background: "rgba(34,211,238,0.1)",
                color: "#22D3EE",
                border: "1px solid rgba(34,211,238,0.3)",
              }}
            >
              Legal
            </span>
            <h1
              className="mt-4 text-4xl font-bold"
              style={{ color: "#EAF2FF" }}
            >
              Privacy Policy &amp; Terms of Service
            </h1>
            <p className="mt-3 text-sm" style={{ color: "#9AA9BC" }}>
              Last updated: April 2026 · PhoneTrace is committed to protecting
              your privacy.
            </p>
          </div>

          <div className="space-y-6">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
              >
                <GlassCard>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">{section.icon}</span>
                    <h2
                      className="text-lg font-semibold"
                      style={{ color: "#EAF2FF" }}
                    >
                      {section.title}
                    </h2>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#9AA9BC" }}
                  >
                    {section.content}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <div
            className="mt-8 rounded-2xl p-6 text-center"
            style={{
              background: "rgba(34,211,238,0.04)",
              border: "1px solid rgba(34,211,238,0.15)",
            }}
          >
            <p className="text-sm" style={{ color: "#9AA9BC" }}>
              By using PhoneTrace, you agree to these terms. This platform is
              for lawful, consent-based use only. Misuse or unauthorized
              tracking is strictly prohibited and may be subject to legal action
              under applicable laws.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer
        className="mt-12 border-t border-white/5 py-8 text-center text-xs"
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

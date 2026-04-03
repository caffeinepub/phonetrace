import { motion } from "motion/react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 w-full border-b border-white/10"
      style={{
        background: "rgba(11,18,32,0.85)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-bold"
          data-ocid="nav.link"
        >
          <span className="text-2xl">📡</span>
          <span style={{ color: "#22D3EE" }}>PhoneTrace</span>
        </Link>

        {/* Center nav links */}
        <div className="hidden items-center gap-8 md:flex">
          <Link
            to="/"
            className="text-sm font-medium transition-colors hover:text-[#22D3EE]"
            style={{ color: "#9AA9BC" }}
            data-ocid="nav.link"
          >
            Home
          </Link>
          <Link
            to="/request"
            className="text-sm font-medium transition-colors hover:text-[#22D3EE]"
            style={{ color: "#9AA9BC" }}
            data-ocid="nav.link"
          >
            Track
          </Link>
          <Link
            to="/privacy"
            className="text-sm font-medium transition-colors hover:text-[#22D3EE]"
            style={{ color: "#9AA9BC" }}
            data-ocid="nav.link"
          >
            Privacy
          </Link>
        </div>

        {/* CTA button */}
        <Link
          to="/"
          className="cyan-btn hidden px-5 py-2 text-sm md:inline-flex"
          data-ocid="nav.primary_button"
        >
          Get Started
        </Link>
      </div>
    </motion.nav>
  );
}

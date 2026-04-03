interface OperatorBadgeProps {
  operator: string;
}

const operatorColors: Record<string, string> = {
  Jio: "background: rgba(29,78,216,0.25); color: #93C5FD; border: 1px solid rgba(59,130,246,0.4)",
  Airtel:
    "background: rgba(185,28,28,0.25); color: #FCA5A5; border: 1px solid rgba(239,68,68,0.4)",
  Vi: "background: rgba(109,40,217,0.25); color: #C4B5FD; border: 1px solid rgba(139,92,246,0.4)",
  BSNL: "background: rgba(21,128,61,0.25); color: #86EFAC; border: 1px solid rgba(34,197,94,0.4)",
};

export default function OperatorBadge({ operator }: OperatorBadgeProps) {
  const style =
    operatorColors[operator] ||
    "background: rgba(75,85,99,0.25); color: #D1D5DB; border: 1px solid rgba(107,114,128,0.4)";

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      style={Object.fromEntries(
        style
          .split(";")
          .filter(Boolean)
          .map((s) => {
            const [k, ...v] = s.trim().split(":");
            return [
              k.trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()),
              v.join(":").trim(),
            ];
          }),
      )}
    >
      {operator}
    </span>
  );
}

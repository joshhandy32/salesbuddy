// Huckleberry-styled Recharts tooltip: white card, soft shadow, coral value.
export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number; name?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-input border border-line bg-card px-3 py-2 shadow-md">
      {label && <div className="label-caps mb-0.5">{label}</div>}
      <div className="text-[14px] font-bold text-coral-dark">{payload[0]?.value}</div>
    </div>
  );
}

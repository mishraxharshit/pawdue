const PALETTE = ["#2B5D4C", "#C98A3D", "#4C7A8C", "#8A7B54", "#7C6A8B", "#1D4536"];

function colorFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initialsFor(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, size = 34 }) {
  const label = name || "?";
  return (
    <span
      className="pd-avatar"
      style={{
        width: size,
        height: size,
        minWidth: size,
        fontSize: size * 0.4,
        background: colorFor(label),
      }}
    >
      {initialsFor(label)}
    </span>
  );
}

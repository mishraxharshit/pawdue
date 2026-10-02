// Shared brand mark, used in every marketing nav + the footer so the
// product reads like one consistent company instead of a text link that
// happens to say "PawDue". Colors are hardcoded (not CSS vars) so the
// mark looks correct anywhere, even outside the .pd-landing scope.
export default function Logo({ size = 34, withWordmark = true, dark = false, className = "" }) {
  const ink = dark ? "#FFFFFF" : "#17211D";
  const coral = "#C98A3D";

  return (
    <span className={`pd-logo ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="pd-logo-mark"
      >
        <rect width="40" height="40" rx="11" fill="#2B5D4C" />
        {/* paw print */}
        <circle cx="20" cy="24" r="7.2" fill="#FFFFFF" />
        <circle cx="11.5" cy="15.5" r="3.4" fill="#FFFFFF" />
        <circle cx="20" cy="11.5" r="3.6" fill="#FFFFFF" />
        <circle cx="28.5" cy="15.5" r="3.4" fill="#FFFFFF" />
        {/* due "tick" accent so the mark reads as reminders, not just a pet app */}
        <circle cx="30" cy="30" r="6" fill={coral} stroke="#2B5D4C" strokeWidth="1.5" />
        <path d="M30 27v3.2l2.2 1.6" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {withWordmark && (
        <span className="pd-logo-word" style={{ color: ink }}>
          Paw<em>Due</em>
        </span>
      )}
    </span>
  );
}

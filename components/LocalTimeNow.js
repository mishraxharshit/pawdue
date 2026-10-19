import { useEffect, useState } from "react";

// "Right now it is 2:32 PM in Asia/Kolkata", so the groomer can confirm the
// timezone is the right one. Computed after mount to avoid a server/client mismatch.
export default function LocalTimeNow({ timezone }) {
  const [text, setText] = useState("");
  useEffect(() => {
    function tick() {
      try {
        setText(
          new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", weekday: "short", timeZone: timezone || "UTC" }).format(new Date())
        );
      } catch {
        setText("");
      }
    }
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [timezone]);
  if (!text) return null;
  return (
    <div className="pd-set-now">
      Right now it is <b>{text}</b> in {timezone}
    </div>
  );
}

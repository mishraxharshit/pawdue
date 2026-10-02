import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { groupSlotsByDay } from "../../lib/booking";
import ClientStatusCard from "../../components/ClientStatusCard";
import { useLanguage } from "../../lib/i18n/LanguageContext";

export default function BookingPage() {
  const router = useRouter();
  const { token } = router.query;
  const { translate, locale } = useLanguage();

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [optingOut, setOptingOut] = useState(false);
  const [optedOut, setOptedOut] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/bookings/availability/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || translate("booking.couldNotLoad"));
        return res.json();
      })
      .then(setInfo)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConfirm() {
    setConfirming(true);
    setError("");
    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, slot: selectedSlot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || translate("booking.couldNotBook"));
      setConfirmed(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  }

  async function handleOptOut() {
    setOptingOut(true);
    try {
      const res = await fetch("/api/bookings/opt-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("Could not process that - please contact your groomer directly.");
      setOptedOut(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setOptingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="wrap authcard">
        <div className="card">{translate("booking.loading")}</div>
      </div>
    );
  }

  if (optedOut) {
    return (
      <div className="wrap authcard">
        <div className="card">
          <h1>Paw<span>Due</span></h1>
          <p className="sub" style={{ marginTop: 10 }}>{translate("booking.optedOutMessage")}</p>
        </div>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="wrap authcard">
        <div className="card">
          <h1>Paw<span>Due</span></h1>
          <p className="error">{error}</p>
        </div>
      </div>
    );
  }

  if (confirmed) {
    const when = `${new Date(selectedSlot).toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" })} ${new Date(selectedSlot).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}`;
    return (
      <div className="wrap authcard">
        <div className="card">
          <h1>Paw<span>Due</span></h1>
          <p style={{ fontSize: "1.05rem", marginTop: 10 }}>
            {translate("booking.confirmed", { dog: confirmed.dogName, when })}
          </p>
        </div>
      </div>
    );
  }

  const grouped = groupSlotsByDay(info.slots);

  return (
    <div className="wrap" style={{ maxWidth: 480 }}>
      <div className="card">
        <h1>Paw<span>Due</span></h1>

        {info.status && <ClientStatusCard status={info.status} dogName={info.dogName} breed={info.breed} />}

        <p className="sub" style={{ marginBottom: 4, marginTop: 18 }}>{translate("booking.bookSlotFor")}</p>
        <p style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 0 }}>
          {info.dogName} <span style={{ fontWeight: 400, color: "var(--sub)" }}>· {info.breed}</span>
        </p>

        {Object.keys(grouped).length === 0 && (
          <p className="sub">{translate("booking.noSlots")}</p>
        )}

        {Object.entries(grouped).map(([day, isoSlots]) => (
          <div key={day} style={{ marginBottom: 14 }}>
            <div className="sub" style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>{day}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {isoSlots.map((iso) => (
                <button
                  key={iso}
                  className={selectedSlot === iso ? "small" : "ghost small"}
                  onClick={() => setSelectedSlot(iso)}
                >
                  {new Date(iso).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                </button>
              ))}
            </div>
          </div>
        ))}

        {error && <div className="error">{error}</div>}

        {selectedSlot && (
          <button style={{ marginTop: 10 }} onClick={handleConfirm} disabled={confirming}>
            {confirming ? translate("booking.booking") : translate("booking.confirmSlot")}
          </button>
        )}

        <p className="sub" style={{ marginTop: 20, fontSize: ".78rem", textAlign: "center" }}>
          {translate("booking.stopRemindersQuestion", { dog: info.dogName })}{" "}
          <button
            className="link"
            style={{ background: "none", border: "none", padding: 0, font: "inherit" }}
            onClick={handleOptOut}
            disabled={optingOut}
          >
            {optingOut ? translate("booking.processing") : translate("booking.stopReminders")}
          </button>
        </p>
      </div>
    </div>
  );
}

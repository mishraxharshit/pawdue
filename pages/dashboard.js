import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { BREED_INTERVALS, computeStatus, reminderMessage } from "../lib/breedIntervals";
import Avatar from "../components/Avatar";
import DogModal from "../components/DogModal";
import RevenueBanner from "../components/RevenueBanner";
import SetupBanner from "../components/SetupBanner";
import RevenueChart from "../components/RevenueChart";
import StatusDonut from "../components/StatusDonut";
import ReminderBreakdown from "../components/ReminderBreakdown";
import ActivityFeed from "../components/ActivityFeed";
import {
  IconHome, IconCalendar, IconInbox, IconCard, IconHelp, IconLogout, IconPlus,
  IconBell, IconSearch, IconPencil, IconArchive, IconMessage, IconChevronDown,
  IconRestore, IconTrash, IconCheck, IconClock, IconChart,
} from "../components/icons";
import { DEFAULT_AVAILABILITY } from "../lib/booking";

const DAY_LABELS = [
  { value: 0, short: "Sun" }, { value: 1, short: "Mon" }, { value: 2, short: "Tue" },
  { value: 3, short: "Wed" }, { value: 4, short: "Thu" }, { value: 5, short: "Fri" },
  { value: 6, short: "Sat" },
];
const SLOT_LENGTH_OPTIONS = [15, 30, 45, 60, 90, 120];

export async function getServerSideProps({ req, res }) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }
  return { props: { userId: user.id, userEmail: user.email || "" } };
}

let toastIdCounter = 0;

const emptyForm = {
  dogName: "",
  ownerName: "",
  phone: "",
  ownerEmail: "",
  breed: Object.keys(BREED_INTERVALS)[0],
  lastGroomDate: "",
  customWeeks: "",
  notes: "",
};

const STATUS_LABEL = { overdue: "Overdue", soon: "Due soon", ok: "On track" };
const STATUS_ORDER = ["overdue", "soon", "ok"];

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Sao_Paulo", "America/Mexico_City", "America/Toronto",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Moscow",
  "Asia/Kolkata", "Asia/Dubai", "Asia/Karachi", "Asia/Dhaka", "Asia/Bangkok",
  "Asia/Singapore", "Asia/Shanghai", "Asia/Tokyo", "Asia/Seoul", "Asia/Jakarta",
  "Australia/Sydney", "Australia/Perth", "Pacific/Auckland", "Africa/Lagos",
  "Africa/Johannesburg", "Africa/Cairo",
];

export default function Dashboard({ userId, userEmail }) {
  const router = useRouter();
  const [dogs, setDogs] = useState([]);
  const [archivedDogs, setArchivedDogs] = useState([]);
  const [activeView, setActiveView] = useState("dogs"); // 'dogs' | 'archived' | 'bookings' | 'billing'
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [groupBy, setGroupBy] = useState("status"); // 'status' | 'name'
  const [search, setSearch] = useState("");
  const [openMsgId, setOpenMsgId] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);
  const [billing, setBilling] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [availabilityForm, setAvailabilityForm] = useState(DEFAULT_AVAILABILITY);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [breakEnabled, setBreakEnabled] = useState(false);
  const [timezone, setTimezone] = useState("UTC");
  const [timezoneForm, setTimezoneForm] = useState("UTC");
  const [timezoneSaving, setTimezoneSaving] = useState(false);
  const [timezoneSaved, setTimezoneSaved] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' | 'edit'
  const [modalValues, setModalValues] = useState(emptyForm);
  const [modalSaving, setModalSaving] = useState(false);
  const [editingDog, setEditingDog] = useState(null);

  function showToast(message, type = "success") {
    const id = ++toastIdCounter;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }

  async function loadDogs() {
    const res = await fetch("/api/dogs");
    if (res.ok) setDogs(await res.json());
    setIsLoading(false);
  }

  async function loadArchivedDogs() {
    const res = await fetch("/api/dogs?archived=1");
    if (res.ok) setArchivedDogs(await res.json());
  }

  async function loadBilling() {
    const res = await fetch("/api/billing/status");
    if (res.ok) setBilling(await res.json());
  }

  async function loadBookings() {
    const res = await fetch("/api/bookings/list");
    if (res.ok) setBookings(await res.json());
  }

  async function loadAvailability() {
    const res = await fetch("/api/availability");
    if (res.ok) {
      const data = await res.json();
      setAvailability(data);
      setAvailabilityForm(data);
      setBreakEnabled(!!(data.breakStart && data.breakEnd));
    }
  }

  async function loadBusinessSettings() {
    const res = await fetch("/api/settings/business");
    if (res.ok) {
      const data = await res.json();
      setTimezone(data.timezone || "UTC");
      setTimezoneForm(data.timezone || "UTC");
    }
  }

  async function saveTimezone() {
    setTimezoneSaving(true);
    setTimezoneSaved(false);
    const res = await fetch("/api/settings/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: timezoneForm }),
    });
    if (res.ok) {
      setTimezone(timezoneForm);
      setTimezoneSaved(true);
      setTimeout(() => setTimezoneSaved(false), 2500);
    }
    setTimezoneSaving(false);
  }

  useEffect(() => {
    loadDogs();
    loadBilling();
    loadBookings();
    loadAvailability();
    loadBusinessSettings();
  }, []);

  useEffect(() => {
    if (activeView === "archived") loadArchivedDogs();
  }, [activeView]);

  // Supabase Realtime: the instant an owner books a slot through their
  // booking link, this fires - no page refresh, no polling needed.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    const channelName = `bookings-changes-${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelName);

    if (!cancelled) {
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bookings", filter: `user_id=eq.${userId}` },
          () => {
            showToast("🎉 New booking just came in!");
            loadBookings();
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "dogs", filter: `user_id=eq.${userId}` },
          () => {
            // Covers reminder sends (last_reminder_sent_at changing) as well
            // as edits made from another tab - either way, refresh silently
            // rather than toast on every single field change.
            loadDogs();
          }
        )
        .subscribe();
    }

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Close dropdowns when clicking outside them.
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Unique owners from the current dog list, for the autocomplete datalist -
  // typing an existing owner's name and tabbing to phone auto-fills it, so a
  // groomer with 3 dogs for the same owner doesn't retype the phone 3 times.
  const knownOwners = useMemo(() => {
    const map = new Map();
    for (const d of dogs) {
      if (!map.has(d.owner_name.toLowerCase())) map.set(d.owner_name.toLowerCase(), d);
    }
    return [...map.values()];
  }, [dogs]);

  function toggleWorkingDay(day) {
    setAvailabilityForm((f) => {
      const has = f.workingDays.includes(day);
      const workingDays = has ? f.workingDays.filter((d) => d !== day) : [...f.workingDays, day].sort();
      return { ...f, workingDays };
    });
  }

  async function saveAvailability() {
    setAvailabilitySaving(true);
    setAvailabilityError("");
    const payload = {
      ...availabilityForm,
      breakStart: breakEnabled ? availabilityForm.breakStart : null,
      breakEnd: breakEnabled ? availabilityForm.breakEnd : null,
    };
    try {
      const res = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save availability.");
      setAvailability(data);
      setAvailabilityForm(data);
      setBreakEnabled(!!(data.breakStart && data.breakEnd));
      showToast("Availability updated");
    } catch (err) {
      setAvailabilityError(err.message);
    } finally {
      setAvailabilitySaving(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/dodo/create-portal-session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setPortalLoading(false);
    }
  }

  function openAddModal() {
    setModalMode("add");
    setEditingDog(null);
    setModalValues(emptyForm);
    setError("");
    setLimitReached(false);
    setModalOpen(true);
  }

  function openEditModal(dog) {
    setModalMode("edit");
    setEditingDog(dog);
    setModalValues({
      dogName: dog.dog_name,
      ownerName: dog.owner_name,
      phone: dog.phone,
      breed: dog.breed,
      lastGroomDate: dog.last_groom_date,
      customWeeks: String(dog.interval_weeks),
      notes: dog.notes || "",
      ownerEmail: dog.owner_email || "",
    });
    setError("");
    setLimitReached(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingDog(null);
  }

  async function handleModalSubmit(form) {
    setModalSaving(true);
    setError("");
    setLimitReached(false);

    if (modalMode === "add") {
      const res = await fetch("/api/dogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Could not add dog");
        setLimitReached(!!data.limitReached);
        setModalSaving(false);
        return;
      }
      showToast(`${form.dogName} added ✓`);
      closeModal();
      loadDogs();
      loadBilling();
    } else {
      const res = await fetch(`/api/dogs/${editingDog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dogName: form.dogName,
          ownerName: form.ownerName,
          phone: form.phone,
          breed: form.breed,
          lastGroomDate: form.lastGroomDate,
          intervalWeeks: form.customWeeks,
          notes: form.notes,
          ownerEmail: form.ownerEmail,
        }),
      });
      if (res.ok) {
        showToast(`${form.dogName} updated ✓`);
        closeModal();
        await loadDogs();
      } else {
        setError("Could not save changes");
      }
    }
    setModalSaving(false);
  }

  async function markGroomed(dog) {
    setBusyId(dog.id);
    await fetch(`/api/dogs/${dog.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markGroomedToday: true }),
    });
    showToast(`${dog.dog_name} marked as groomed today ✓`);
    await loadDogs();
    setBusyId(null);
  }

  async function archiveDog(dog) {
    setBusyId(dog.id);
    await fetch(`/api/dogs/${dog.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: true }),
    });
    showToast(`${dog.dog_name} archived`);
    await loadDogs();
    setBusyId(null);
  }

  async function restoreDog(dog) {
    setBusyId(dog.id);
    await fetch(`/api/dogs/${dog.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: false }),
    });
    showToast(`${dog.dog_name} restored`);
    await loadArchivedDogs();
    await loadDogs();
    setBusyId(null);
  }

  async function deleteDog(dog) {
    if (!confirm(`Permanently delete ${dog.dog_name}? This can't be undone - consider Archive instead.`)) return;
    setBusyId(dog.id);
    await fetch(`/api/dogs/${dog.id}`, { method: "DELETE" });
    showToast(`${dog.dog_name} permanently deleted`);
    await loadArchivedDogs();
    await loadDogs();
    setBusyId(null);
  }

  function copyReminder(dog, comp) {
    const text = reminderMessage(dog, comp);
    navigator.clipboard?.writeText(text);
    showToast("Reminder text copied ✓");
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete account");
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/");
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids) {
    setSelectedIds((prev) => (prev.size === ids.length ? new Set() : new Set(ids)));
  }

  async function bulkMarkGroomed() {
    const ids = [...selectedIds];
    setBusyId("bulk");
    await Promise.all(ids.map((id) => fetch(`/api/dogs/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markGroomedToday: true }),
    })));
    showToast(`${ids.length} dog${ids.length === 1 ? "" : "s"} marked as groomed today ✓`);
    setSelectedIds(new Set());
    await loadDogs();
    setBusyId(null);
  }

  async function bulkArchive() {
    const ids = [...selectedIds];
    setBusyId("bulk");
    await Promise.all(ids.map((id) => fetch(`/api/dogs/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: true }),
    })));
    showToast(`${ids.length} dog${ids.length === 1 ? "" : "s"} archived`);
    setSelectedIds(new Set());
    await loadDogs();
    setBusyId(null);
  }

  const withComp = dogs.map((d) => ({ dog: d, comp: computeStatus(d, new Date(), timezone) }));
  const counts = { overdue: 0, soon: 0, ok: 0 };
  withComp.forEach((x) => counts[x.comp.status]++);

  const needsAttention = [...withComp]
    .filter((x) => x.comp.status !== "ok")
    .sort((a, b) => a.comp.daysLeft - b.comp.daysLeft);

  let filtered = filter === "all" ? withComp : withComp.filter((x) => x.comp.status === filter);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    filtered = filtered.filter(
      (x) =>
        x.dog.dog_name.toLowerCase().includes(q) ||
        x.dog.owner_name.toLowerCase().includes(q) ||
        (qDigits && x.dog.phone.replace(/\D/g, "").includes(qDigits))
    );
  }

  // Grouped-by-status view: sections in overdue -> soon -> ok order, each
  // internally sorted by how soon it's due. Grouped-by-name: one flat,
  // alphabetical list - mirrors the "Group by Category / Schedule" toggle
  // from the reference dashboard, adapted to data PawDue actually has.
  const groups = useMemo(() => {
    if (groupBy === "name") {
      return [{ key: "all", label: null, rows: [...filtered].sort((a, b) => a.dog.dog_name.localeCompare(b.dog.dog_name)) }];
    }
    return STATUS_ORDER
      .map((status) => ({
        key: status,
        label: STATUS_LABEL[status],
        rows: filtered.filter((x) => x.comp.status === status).sort((a, b) => a.comp.daysLeft - b.comp.daysLeft),
      }))
      .filter((g) => g.rows.length > 0);
  }, [filtered, groupBy]);

  const visibleIds = filtered.map((x) => x.dog.id);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const NAV_ITEMS = [
    { key: "dogs", label: "Dogs", icon: IconHome, badge: needsAttention.length },
    { key: "analytics", label: "Analytics", icon: IconChart },
    { key: "bookings", label: "Bookings", icon: IconCalendar, badge: bookings.length },
    { key: "availability", label: "Availability", icon: IconClock },
    { key: "archived", label: "Archived", icon: IconInbox },
    { key: "billing", label: "Billing", icon: IconCard },
  ];

  const VIEW_TITLE = {
    dogs: "Dogs", analytics: "Analytics", bookings: "Bookings", availability: "Availability",
    archived: "Archived", billing: "Billing",
  };

  return (
    <div className="pd-app">
      {/* ---------- Toasts ---------- */}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
        ))}
      </div>

      {/* ---------- Sidebar ---------- */}
      <aside className="pd-sidebar">
        <div className="pd-sidebar-logo">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="PawDue">
            <rect width="40" height="40" rx="11" fill="#2B5D4C" />
            <circle cx="20" cy="24" r="7.2" fill="#fff" />
            <circle cx="11.5" cy="15.5" r="3.4" fill="#fff" />
            <circle cx="20" cy="11.5" r="3.6" fill="#fff" />
            <circle cx="28.5" cy="15.5" r="3.4" fill="#fff" />
            <circle cx="30" cy="30" r="6" fill="#C98A3D" stroke="#2B5D4C" strokeWidth="1.5" />
          </svg>
        </div>
        <nav className="pd-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`pd-sidebar-btn ${activeView === item.key ? "active" : ""}`}
              onClick={() => setActiveView(item.key)}
              title={item.label}
              aria-label={item.label}
            >
              <item.icon />
              {!!item.badge && <span className="pd-sidebar-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="pd-sidebar-bottom">
          <Link className="pd-sidebar-btn" href="/help" title="Help" aria-label="Help">
            <IconHelp />
          </Link>
          <button className="pd-sidebar-btn" onClick={handleSignOut} title="Log out" aria-label="Log out">
            <IconLogout />
          </button>
        </div>
      </aside>

      {/* ---------- Main ---------- */}
      <main className="pd-main">
        <div className="pd-topbar">
          <div>
            <h1>{VIEW_TITLE[activeView]}</h1>
            <div className="pd-topbar-date">{today}</div>
          </div>
          <div className="pd-topbar-actions">
            {activeView === "dogs" && (
              <button className="pd-icon-btn primary" onClick={openAddModal} aria-label="Add dog" title="Add dog">
                <IconPlus />
              </button>
            )}
            <div className="notif-wrap" ref={notifRef}>
              <button className="pd-icon-btn" onClick={() => setNotifOpen((o) => !o)} aria-label="Notifications" title="Notifications">
                <IconBell />
                {needsAttention.length > 0 && <span className="notif-count">{needsAttention.length}</span>}
              </button>
              {notifOpen && (
                <div className="notif-dropdown">
                  <div className="notif-head">Needs attention</div>
                  {needsAttention.length === 0 && <div className="notif-empty">You&apos;re all caught up 🎉</div>}
                  {needsAttention.map(({ dog, comp }) => (
                    <div className="notif-item" key={dog.id}>
                      <span className={`notif-dot ${comp.status === "overdue" ? "blink" : ""}`} />
                      <div className="notif-item-text">
                        <b>{dog.dog_name}</b>
                        <span>{comp.status === "overdue" ? `${Math.abs(comp.daysLeft)}d overdue` : `due in ${comp.daysLeft}d`}</span>
                      </div>
                      <button className="notif-quick" onClick={() => markGroomed(dog)}>Groomed</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pd-profile" ref={profileRef} onClick={() => setProfileOpen((o) => !o)}>
              <Avatar name={userEmail || "P D"} size={30} />
              <div>
                <div className="pd-profile-name">{userEmail}</div>
                <div className="pd-profile-sub">{billing?.planName || "Free"} plan</div>
              </div>
              <IconChevronDown width={14} height={14} />
              {profileOpen && (
                <div className="pd-profile-dropdown">
                  <button onClick={() => setActiveView("billing")}><IconCard /> Billing</button>
                  <button onClick={handleSignOut}><IconLogout /> Log out</button>
                  <button onClick={() => { setProfileOpen(false); setDeleteModalOpen(true); }} className="pd-danger-item">
                    <IconTrash /> Delete account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <SetupBanner />

        {billing && activeView !== "billing" && (
          <div className="usage-bar">
            <div className="usage-label">
              <b>{billing.planName} plan</b> · {billing.dogCount}
              {billing.limit === Infinity ? "" : ` / ${billing.limit}`} dogs used
            </div>
            {!billing.hasBillingAccount && <Link className="link" href="/pricing">Upgrade plan</Link>}
          </div>
        )}

        {/* ---------- Dogs view ---------- */}
        {activeView === "dogs" && (
          <>
            <RevenueBanner />

            <div className="pd-stat-chips">
              <div className="pd-stat-chip overdue">
                <div>
                  <div className="pd-stat-chip-num">{counts.overdue}</div>
                  <div className="pd-stat-chip-label">Overdue</div>
                </div>
              </div>
              <div className="pd-stat-chip soon">
                <div>
                  <div className="pd-stat-chip-num">{counts.soon}</div>
                  <div className="pd-stat-chip-label">Due soon</div>
                </div>
              </div>
              <div className="pd-stat-chip ok">
                <div>
                  <div className="pd-stat-chip-num">{counts.ok}</div>
                  <div className="pd-stat-chip-label">On track</div>
                </div>
              </div>
            </div>

            <div className="pd-filterbar">
              <div className="pd-searchbox">
                <IconSearch width={16} height={16} />
                <input placeholder="Search by dog, owner, or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="pd-select-wrap">
                <select className="pd-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="overdue">Overdue</option>
                  <option value="soon">Due soon</option>
                  <option value="ok">On track</option>
                </select>
                <IconChevronDown width={14} height={14} />
              </div>
              <div className="pd-groupby">
                <span className="pd-groupby-label">Group by</span>
                <div className="pd-segmented">
                  <button className={groupBy === "status" ? "active" : ""} onClick={() => setGroupBy("status")}>Status</button>
                  <button className={groupBy === "name" ? "active" : ""} onClick={() => setGroupBy("name")}>Name</button>
                </div>
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="pd-bulkbar">
                <span>{selectedIds.size} selected</span>
                <div className="pd-bulkbar-actions">
                  <button className="ghost" onClick={bulkMarkGroomed} disabled={busyId === "bulk"}>Mark groomed today</button>
                  <button className="ghost" onClick={bulkArchive} disabled={busyId === "bulk"}>Archive</button>
                  <button className="ghost" onClick={() => setSelectedIds(new Set())}>Clear</button>
                </div>
              </div>
            )}

            {isLoading && (
              <>
                <div className="skeleton-card" />
                <div className="skeleton-card" />
                <div className="skeleton-card" />
              </>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="pd-table">
                <div className="pd-tempty">
                  {search ? "No dogs match your search." : "No dogs here yet. Click + to add one."}
                </div>
              </div>
            )}

            {!isLoading && filtered.length > 0 && (
              <div className="pd-table">
                <div className="pd-trow pd-thead">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === visibleIds.length}
                    onChange={() => toggleSelectAll(visibleIds)}
                  />
                  <div>Dog</div>
                  <div className="pd-thead-owner">Owner</div>
                  <div className="pd-thead-due">Next due</div>
                  <div>Status</div>
                  <div style={{ textAlign: "right" }}>Actions</div>
                </div>

                {groups.map((group) => (
                  <div key={group.key}>
                    {group.label && <div className="pd-trow-group">{group.label} · {group.rows.length}</div>}
                    {group.rows.map(({ dog, comp }) => (
                      <div key={dog.id}>
                        <div className="pd-trow">
                          <input type="checkbox" checked={selectedIds.has(dog.id)} onChange={() => toggleSelect(dog.id)} />
                          <div className="pd-tcell-dog">
                            <Avatar name={dog.dog_name} size={32} />
                            <div style={{ minWidth: 0 }}>
                              <div className="pd-tcell-dog-name">
                                {comp.status === "overdue" && <span className="dot blink" />}
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dog.dog_name}</span>
                                {dog.opted_out && <span className="tag-muted">🔕</span>}
                              </div>
                              <div className="pd-tcell-dog-breed">{dog.breed}</div>
                            </div>
                          </div>
                          <div className="pd-tcell-owner">
                            <div>{dog.owner_name}</div>
                            <div className="pd-tcell-owner-phone">{dog.phone}</div>
                          </div>
                          <div className="pd-tcell-due-col">
                            <div className="pd-tcell-due">{comp.due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                            <div className="pd-tcell-due-sub">
                              {comp.daysLeft < 0 ? `${Math.abs(comp.daysLeft)}d overdue` : `${comp.daysLeft}d left`}
                            </div>
                          </div>
                          <div>
                            <span className={`badge ${comp.status}`}>{STATUS_LABEL[comp.status]}</span>
                          </div>
                          <div className="pd-tcell-actions">
                            <button className="pd-row-action" title="Preview reminder" onClick={() => setOpenMsgId(openMsgId === dog.id ? null : dog.id)}>
                              <IconMessage />
                            </button>
                            <button className="pd-row-action" title="Mark groomed today" onClick={() => markGroomed(dog)} disabled={busyId === dog.id}>
                              <IconCheck />
                            </button>
                            <button className="pd-row-action" title="Edit" onClick={() => openEditModal(dog)} disabled={busyId === dog.id}>
                              <IconPencil />
                            </button>
                            <button className="pd-row-action" title="Archive" onClick={() => archiveDog(dog)} disabled={busyId === dog.id}>
                              <IconArchive />
                            </button>
                          </div>
                        </div>
                        {openMsgId === dog.id && (
                          <div className="msgbox" style={{ margin: "0 16px 12px" }}>
                            {reminderMessage(dog, comp)}
                            <div style={{ marginTop: 10 }}>
                              <button className="small ghost" onClick={() => copyReminder(dog, comp)}>Copy text</button>
                            </div>
                          </div>
                        )}
                        {dog.notes && <div className="dognotes" style={{ margin: "0 16px 12px" }}>📝 {dog.notes}</div>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------- Analytics view ---------- */}
        {activeView === "analytics" && (
          <div className="pd-analytics-grid">
            <RevenueChart />
            <StatusDonut counts={counts} />
            <ReminderBreakdown dogs={dogs} />
            <ActivityFeed dogs={dogs} bookings={bookings} />
          </div>
        )}

        {/* ---------- Bookings view ---------- */}
        {activeView === "bookings" && (
          <div className="pd-table">
            {bookings.length === 0 ? (
              <div className="pd-tempty">No upcoming bookings yet — they&apos;ll show up here the moment an owner books through their reminder link.</div>
            ) : (
              <>
                <div className="pd-trow pd-thead" style={{ gridTemplateColumns: "2fr 1.6fr 1.3fr 1fr" }}>
                  <div>Dog</div>
                  <div className="pd-thead-owner">Owner</div>
                  <div>When</div>
                  <div>Status</div>
                </div>
                {bookings.map((b) => (
                  <div className="pd-trow" style={{ gridTemplateColumns: "2fr 1.6fr 1.3fr 1fr" }} key={b.id}>
                    <div className="pd-tcell-dog">
                      <Avatar name={b.dogs?.dog_name || "?"} size={32} />
                      <div>
                        <div className="pd-tcell-dog-name">{b.dogs?.dog_name}</div>
                        <div className="pd-tcell-dog-breed">{b.dogs?.breed}</div>
                      </div>
                    </div>
                    <div className="pd-tcell-owner">{b.dogs?.owner_name}</div>
                    <div className="pd-tcell-due">
                      {new Date(b.slot_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      <div className="pd-tcell-due-sub">{new Date(b.slot_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                    </div>
                    <div><span className="badge ok">{b.status}</span></div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ---------- Archived view ---------- */}
        {activeView === "archived" && (
          <div className="pd-table">
            {archivedDogs.length === 0 ? (
              <div className="pd-tempty">No archived dogs.</div>
            ) : (
              <>
                <div className="pd-trow pd-thead" style={{ gridTemplateColumns: "2fr 1.6fr 72px" }}>
                  <div>Dog</div>
                  <div className="pd-thead-owner">Owner</div>
                  <div style={{ textAlign: "right" }}>Actions</div>
                </div>
                {archivedDogs.map((dog) => (
                  <div className="pd-trow" style={{ gridTemplateColumns: "2fr 1.6fr 72px" }} key={dog.id}>
                    <div className="pd-tcell-dog">
                      <Avatar name={dog.dog_name} size={32} />
                      <div>
                        <div className="pd-tcell-dog-name">{dog.dog_name}</div>
                        <div className="pd-tcell-dog-breed">{dog.breed} · every ~{dog.interval_weeks}wk</div>
                      </div>
                    </div>
                    <div className="pd-tcell-owner">{dog.owner_name}</div>
                    <div className="pd-tcell-actions">
                      <button className="pd-row-action" title="Restore" onClick={() => restoreDog(dog)} disabled={busyId === dog.id}>
                        <IconRestore />
                      </button>
                      <button className="pd-row-action" title="Delete permanently" onClick={() => deleteDog(dog)} disabled={busyId === dog.id}>
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ---------- Availability view ----------
            Per-groomer booking hours. This is what a client sees on their
            public booking page (pages/book/[token].js) - previously a fixed
            Mon-Sat 9-5 constant shared by every account. */}
        {activeView === "availability" && (
          <div className="card" style={{ maxWidth: 560 }}>
            {!availability ? (
              <div className="skeleton-card" />
            ) : (
              <>
                <p className="sub" style={{ margin: "0 0 20px" }}>
                  This is what clients see when they open their booking link. Changes apply immediately.
                </p>

                <label className="pd-avail-label">Working days</label>
                <div className="pd-avail-days">
                  {DAY_LABELS.map((d) => (
                    <button
                      type="button"
                      key={d.value}
                      className={`pd-avail-day ${availabilityForm.workingDays.includes(d.value) ? "active" : ""}`}
                      onClick={() => toggleWorkingDay(d.value)}
                    >
                      {d.short}
                    </button>
                  ))}
                </div>

                <div className="pd-avail-row">
                  <div>
                    <label className="pd-avail-label">Start time</label>
                    <input
                      type="time"
                      value={availabilityForm.startTime}
                      onChange={(e) => setAvailabilityForm((f) => ({ ...f, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="pd-avail-label">End time</label>
                    <input
                      type="time"
                      value={availabilityForm.endTime}
                      onChange={(e) => setAvailabilityForm((f) => ({ ...f, endTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="pd-avail-label">Slot length</label>
                    <select
                      value={availabilityForm.slotMinutes}
                      onChange={(e) => setAvailabilityForm((f) => ({ ...f, slotMinutes: Number(e.target.value) }))}
                    >
                      {SLOT_LENGTH_OPTIONS.map((m) => (
                        <option key={m} value={m}>{m} min</option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="pd-avail-checkline">
                  <input type="checkbox" checked={breakEnabled} onChange={(e) => setBreakEnabled(e.target.checked)} />
                  Block out a break (e.g. lunch)
                </label>
                {breakEnabled && (
                  <div className="pd-avail-row">
                    <div>
                      <label className="pd-avail-label">Break start</label>
                      <input
                        type="time"
                        value={availabilityForm.breakStart || ""}
                        onChange={(e) => setAvailabilityForm((f) => ({ ...f, breakStart: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="pd-avail-label">Break end</label>
                      <input
                        type="time"
                        value={availabilityForm.breakEnd || ""}
                        onChange={(e) => setAvailabilityForm((f) => ({ ...f, breakEnd: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  <label className="pd-avail-label">Days ahead clients can book</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    style={{ maxWidth: 120 }}
                    value={availabilityForm.daysAhead}
                    onChange={(e) => setAvailabilityForm((f) => ({ ...f, daysAhead: Number(e.target.value) }))}
                  />
                </div>

                {availabilityError && <div className="error" style={{ marginTop: 14 }}>{availabilityError}</div>}

                <div style={{ marginTop: 22 }}>
                  <button onClick={saveAvailability} disabled={availabilitySaving}>
                    {availabilitySaving ? "Saving…" : "Save availability"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeView === "availability" && (
          <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "1rem" }}>Timezone</h3>
            <p className="sub" style={{ margin: "0 0 14px" }}>
              Used to decide each dog&apos;s local &ldquo;day&rdquo; for due dates and when the
              daily reminder job runs for your account &mdash; not just the server&apos;s timezone.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={timezoneForm}
                onChange={(e) => setTimezoneForm(e.target.value)}
                style={{ maxWidth: 320 }}
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              <button onClick={saveTimezone} disabled={timezoneSaving}>
                {timezoneSaving ? "Saving…" : "Save timezone"}
              </button>
            </div>
            {timezoneSaved && <div className="pd-form-hint" style={{ marginTop: 10, marginBottom: 0 }}>Saved ✓</div>}
          </div>
        )}

        {/* ---------- Billing view ---------- */}
        {activeView === "billing" && (
          <div className="card" style={{ maxWidth: 480 }}>
            {billing ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <b style={{ fontSize: "1.05rem" }}>{billing.planName} plan</b>
                </div>
                <p className="sub" style={{ margin: "0 0 18px" }}>
                  {billing.dogCount}{billing.limit === Infinity ? "" : ` / ${billing.limit}`} dogs used
                </p>
                {billing.hasBillingAccount ? (
                  <button onClick={handleManageBilling} disabled={portalLoading}>
                    {portalLoading ? "Opening…" : "Manage billing"}
                  </button>
                ) : (
                  <Link className="btnlink" href="/pricing" style={{ display: "inline-block", padding: "10px 14px", borderRadius: 9, background: "var(--accent)", color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: ".9rem" }}>
                    Upgrade plan
                  </Link>
                )}
                {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
              </>
            ) : (
              <div className="skeleton-card" />
            )}
          </div>
        )}
      </main>

      {modalOpen && (
        <DogModal
          mode={modalMode}
          initialValues={modalValues}
          knownOwners={knownOwners}
          saving={modalSaving}
          error={error}
          limitReached={limitReached}
          onSubmit={handleModalSubmit}
          onClose={closeModal}
        />
      )}

      {deleteModalOpen && (
        <div className="pd-modal-overlay" onMouseDown={() => !deleting && setDeleteModalOpen(false)}>
          <div className="pd-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="pd-modal-head">
              <h2>Delete your account</h2>
              <button className="pd-modal-close" onClick={() => setDeleteModalOpen(false)} aria-label="Close">
                <IconX />
              </button>
            </div>
            <p style={{ fontSize: ".88rem", color: "var(--sub)", lineHeight: 1.55 }}>
              This permanently deletes your account, every dog, booking, and setting &mdash;
              there&apos;s no undo. Type <b>DELETE</b> below to confirm.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              autoFocus
            />
            {deleteError && <div className="error">{deleteError}</div>}
            <div className="pd-modal-actions">
              <button type="button" className="ghost" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>Cancel</button>
              <button
                type="button"
                className="pd-danger-btn"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== "DELETE"}
              >
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

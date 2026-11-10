import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { BREED_INTERVALS, computeStatus } from "../lib/breedIntervals";
import { LAPSED_AFTER_DAYS } from "../lib/reminderPlan";
import { whatsappUrl, manualMessageText } from "../lib/manualMessage";
import { buildReminderEmail } from "../lib/reminderEmail";
import Avatar from "../components/Avatar";
import DogModal from "../components/DogModal";
import ImportDogsModal from "../components/ImportDogsModal";
import BusinessProfileCard from "../components/BusinessProfileCard";
import CalendarFeedCard from "../components/CalendarFeedCard";
import LocalTimeNow from "../components/LocalTimeNow";
import RecoveredHero from "../components/RecoveredHero";
import WinbackModal from "../components/WinbackModal";
import ServicesEditor from "../components/ServicesEditor";
import ServiceInsights from "../components/ServiceInsights";
import MarkPaidModal from "../components/MarkPaidModal";
import { paidSummary } from "../lib/payments";
import { describeBooking, moneyText } from "../lib/bookingDetails";
import SetupBanner from "../components/SetupBanner";
import { HomeHeader, PausedNotice, NeedsYou, TodaySchedule, ComingUp, GetStarted } from "../components/HomeToday";
import { dayKey, weekStats, failedReminderDogs, comingUp } from "../lib/homeToday";
import RevenueChart from "../components/RevenueChart";
import StatusDonut from "../components/StatusDonut";
import ReminderBreakdown from "../components/ReminderBreakdown";
import ActivityFeed from "../components/ActivityFeed";
import {
  IconHome, IconCalendar, IconInbox, IconCard, IconHelp, IconLogout, IconPlus,
  IconBell, IconSearch, IconPencil, IconArchive, IconMessage, IconChevronDown,
  IconRestore, IconTrash, IconCheck, IconClock, IconChart, IconSettings, IconPaw,
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

const STATUS_LABEL = { overdue: "Overdue", soon: "Due soon", ok: "On track", lapsed: "Lapsed" };
const STATUS_ORDER = ["overdue", "soon", "ok", "lapsed"];
// A dog overdue by more than this many days is "lapsed": no automatic reminders
// go out any more (see lib/reminderPlan.js), so the groomer should reach out.
const LAPSED_HINT = `More than ${LAPSED_AFTER_DAYS} days overdue. PawDue stops sending automatic reminders, so message this client yourself.`;

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
  const [activeView, setActiveView] = useState("home"); // 'home' | 'dogs' (Clients) | 'analytics' | 'bookings' | 'archived' | 'settings' | 'billing'
  const [settingsTab, setSettingsTab] = useState("business"); // 'autopilot' | 'business' | 'services' | 'hours' | 'calendar' | 'account'
  const [isLoading, setIsLoading] = useState(true);
  // Home mixes dogs, bookings and settings. Until all three have answered, show
  // nothing rather than a half-true picture (e.g. "set up your salon" flashing
  // for an account that already did).
  const [bookingsReady, setBookingsReady] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  // How many active services the groomer has. null = not known (for example the
  // services table has not been created yet), so no checklist nag is shown.
  const [servicesCount, setServicesCount] = useState(null);
  const [servicesReady, setServicesReady] = useState(false);
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
  const [bookingScope, setBookingScope] = useState("upcoming"); // 'upcoming' | 'past'
  const [pastBookings, setPastBookings] = useState([]);
  const [markPaid, setMarkPaid] = useState(null); // the booking being marked as paid
  const bookingScopeRef = useRef("upcoming");
  const pastReq = useRef(0);
  // Bumped whenever something changed on the server, so panels that fetch for
  // themselves (recovered money, revenue chart) re-read at the same moment.
  const [syncKey, setSyncKey] = useState(0);
  const bookingsReq = useRef(0);
  const dogsReq = useRef(0);
  const syncTimer = useRef(null);
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
  const [importOpen, setImportOpen] = useState(false);
  const [winbackOpen, setWinbackOpen] = useState(false);
  const [autopilotPaused, setAutopilotPaused] = useState(false);
  const [autopilotAvailable, setAutopilotAvailable] = useState(true);
  const [pauseBusy, setPauseBusy] = useState(false);
  const [profile, setProfile] = useState({ businessName: "", businessPhone: "", replyToEmail: "" });
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
    // no-store: never let the browser answer this from a cached copy. The
    // request counter drops an older answer that arrives after a newer one, so
    // a slow response can never undo what the screen already shows.
    const mine = ++dogsReq.current;
    const res = await fetch("/api/dogs", { cache: "no-store" });
    if (res.ok) {
      const rows = await res.json();
      if (mine === dogsReq.current) setDogs(rows);
    } else {
      // Used to fail silently, which makes "my list didn't update" nearly
      // impossible to diagnose. Now it at least shows up in the console.
      console.error("loadDogs failed with status", res.status);
    }
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
    const mine = ++bookingsReq.current;
    try {
      const res = await fetch("/api/bookings/list", { cache: "no-store" });
      if (res.ok) {
        const rows = await res.json();
        if (mine === bookingsReq.current) setBookings(rows);
      }
    } catch {}
    setBookingsReady(true);
  }

  async function loadPastBookings() {
    const mine = ++pastReq.current;
    try {
      const res = await fetch("/api/bookings/list?scope=past", { cache: "no-store" });
      if (res.ok) {
        const rows = await res.json();
        if (mine === pastReq.current) setPastBookings(rows);
      }
    } catch {}
  }

  function changeBookingScope(scope) {
    bookingScopeRef.current = scope;
    setBookingScope(scope);
    if (scope === "past") loadPastBookings();
  }

  // Shows a payment change on screen at once, in both lists.
  function patchBookingLocal(id, fields) {
    const apply = (list) => list.map((x) => (x.id === id ? { ...x, ...fields } : x));
    setBookings(apply);
    setPastBookings(apply);
  }

  async function markUnpaid(b) {
    if (!window.confirm(`Mark ${b.dogs?.dog_name || "this booking"} as not paid?`)) return;
    const before = { paid_at: b.paid_at, paid_amount: b.paid_amount, paid_method: b.paid_method, receipt_sent_at: b.receipt_sent_at };
    patchBookingLocal(b.id, { paid_at: null, paid_amount: null, paid_method: null, receipt_sent_at: null });
    let res;
    try {
      res = await fetch("/api/bookings/payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: b.id, paid: false }) });
    } catch { res = null; }
    if (res && res.ok) syncAll(0);
    else {
      patchBookingLocal(b.id, before);
      showToast("Could not update the payment", "error");
    }
  }

  function paymentSaved(updated, receipt) {
    patchBookingLocal(updated.id, { paid_at: updated.paid_at, paid_amount: updated.paid_amount, paid_method: updated.paid_method, receipt_sent_at: updated.receipt_sent_at });
    setMarkPaid(null);
    showToast(receipt === "sent" ? "Marked as paid. Receipt emailed." : receipt === "failed" ? "Marked as paid, but the receipt email failed." : "Marked as paid");
    syncAll(0);
  }

  // One call that brings every live number up to date. Many events can arrive
  // in a burst (a cron run touching 30 dogs), so they are folded into a single
  // refresh a moment later instead of 30 requests.
  function syncAll(delay = 150) {
    if (syncTimer.current) return;
    syncTimer.current = setTimeout(() => {
      syncTimer.current = null;
      loadDogs();
      loadBookings();
      if (bookingScopeRef.current === "past") loadPastBookings();
      loadServicesCount();
      setSyncKey((k) => k + 1);
    }, delay);
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

  async function loadServicesCount() {
    try {
      const res = await fetch("/api/services", { cache: "no-store" });
      if (res.ok) {
        const rows = await res.json();
        setServicesCount(rows.filter((s) => s.is_active).length);
      } else {
        setServicesCount(null);
      }
    } catch {}
    setServicesReady(true);
  }

  async function loadBusinessSettings() {
    try {
    const res = await fetch("/api/settings/business");
    if (res.ok) {
      const data = await res.json();
      setTimezone(data.timezone || "UTC");
      setTimezoneForm(data.timezone || "UTC");
      setProfile({ businessName: data.businessName || "", businessPhone: data.businessPhone || "", replyToEmail: data.replyToEmail || "" });
      setAutopilotPaused(!!data.autopilotPaused);
      setAutopilotAvailable(data.autopilotAvailable !== false);
    }
    } catch {}
    setSettingsReady(true);
  }


  // Pause / resume every automatic reminder for this account.
  async function toggleAutopilot() {
    if (!autopilotAvailable) {
      showToast("One-time setup needed: run supabase/add-autopilot.sql in Supabase, then refresh this page.");
      return;
    }
    const next = !autopilotPaused;
    if (next && !window.confirm("Pause all automatic reminders? Nobody will be emailed until you resume. Bookings and your calendar keep working.")) return;
    setPauseBusy(true);
    setAutopilotPaused(next); // the switch flips at once; it flips back if saving fails
    try {
      const res = await fetch("/api/settings/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autopilotPaused: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not change this");
      setAutopilotPaused(!!data.autopilotPaused);
      showToast(next ? "Reminders paused" : "Reminders are back on ✓");
    } catch (err) {
      setAutopilotPaused(!next);
      showToast(err.message);
    }
    setPauseBusy(false);
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
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Could not save timezone", "error");
    }
    setTimezoneSaving(false);
  }

  useEffect(() => {
    loadDogs();
    loadBilling();
    loadBookings();
    loadServicesCount();
    loadAvailability();
    loadBusinessSettings();
  }, []);

  useEffect(() => {
    if (activeView === "archived") loadArchivedDogs();
  }, [activeView]);

  // Supabase Realtime: any change to this salon's bookings or dogs reaches the
  // screen the moment it is saved - another tab, another device, the owner
  // booking, the hourly reminder run. Two details matter here:
  //  - Supabase cannot filter DELETE events, so a filtered listener never hears
  //    a cancelled booking. DELETE is therefore listened to unfiltered, and the
  //    event is only used as a "something changed, re-read" signal (it carries
  //    no data we rely on).
  //  - When the connection (re)opens we re-read everything, so a missed event
  //    while offline is caught up straight away.
  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    const channelName = `salon-live-${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const mine = `user_id=eq.${userId}`;
    const channel = supabase.channel(channelName);

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings", filter: mine }, () => {
        showToast("🎉 New booking just came in!");
        syncAll(0);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: mine }, () => syncAll(0))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "bookings" }, () => syncAll(0))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dogs", filter: mine }, () => syncAll())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dogs", filter: mine }, () => syncAll())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "dogs" }, () => syncAll())
      .subscribe((status) => {
        if (status === "SUBSCRIBED") syncAll(0);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Safety net next to Realtime (sleeping laptop, flaky wifi, a blocked
  // websocket on a salon's network): everything re-reads every 15 seconds while
  // the tab is open and visible, and instantly when the tab is focused, shown,
  // or the connection comes back.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") syncAll(0);
    };
    const timer = setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);

  async function cancelBooking(b) {
    const name = b.dogs?.dog_name || "this dog";
    const note = b.dogs?.owner_email ? " The owner will get an email." : " The owner has no email on file, so tell them yourself.";
    if (!window.confirm(`Cancel ${name}'s booking?${note}`)) return;
    // Gone from the screen the instant they confirm; put back only if the
    // server says no.
    const before = bookings;
    bookingsReq.current++;
    setBookings((prev) => prev.filter((x) => x.id !== b.id));
    showToast("Booking cancelled");
    let res;
    try {
      res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: b.id }),
      });
    } catch {
      res = null;
    }
    if (res && res.ok) {
      syncAll(0);
    } else {
      const data = res ? await res.json().catch(() => ({})) : {};
      setBookings(before);
      showToast(data.error || "Could not cancel the booking", "error");
      syncAll(0);
    }
  }

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
      // The POST already returns the full saved row (including values the
      // server sets itself, like booking_token), so put it straight into the
      // list instead of depending on a second request to fetch it back.
      const created = await res.json();
      setDogs((prev) => (prev.some((d) => d.id === created.id) ? prev : [...prev, created]));
      showToast(`${form.dogName} added ✓`);
      closeModal();
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
        syncAll(0);
      } else {
        setError("Could not save changes");
      }
    }
    setModalSaving(false);
  }

  // Shared by the one-dog actions below: change the screen first, ask the
  // server second, and put the screen back (with a message) if the server says
  // no. Either way the final state is re-read so screen and database agree.
  async function patchDogNow(dog, body, localChange, doneMessage) {
    setBusyId(dog.id);
    const before = dogs;
    dogsReq.current++;
    setDogs(localChange);
    let ok = false;
    try {
      const res = await fetch(`/api/dogs/${dog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      ok = res.ok;
    } catch {}
    if (ok) {
      showToast(doneMessage);
    } else {
      setDogs(before);
      showToast(`Could not update ${dog.dog_name}. Nothing was changed.`, "error");
    }
    syncAll(0);
    setBusyId(null);
  }

  function markGroomed(dog) {
    const today = dayKey(new Date(), timezone);
    return patchDogNow(
      dog,
      { markGroomedToday: true },
      (prev) => prev.map((d) => (d.id === dog.id ? { ...d, last_groom_date: today } : d)),
      `${dog.dog_name} marked as groomed today ✓`
    );
  }

  function archiveDog(dog) {
    return patchDogNow(
      dog,
      { isArchived: true },
      (prev) => prev.filter((d) => d.id !== dog.id),
      `${dog.dog_name} archived`
    );
  }

  async function restoreDog(dog) {
    setBusyId(dog.id);
    const beforeArchived = archivedDogs;
    setArchivedDogs((prev) => prev.filter((d) => d.id !== dog.id));
    let ok = false;
    try {
      const res = await fetch(`/api/dogs/${dog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false }),
      });
      ok = res.ok;
    } catch {}
    if (ok) showToast(`${dog.dog_name} restored`);
    else {
      setArchivedDogs(beforeArchived);
      showToast(`Could not restore ${dog.dog_name}.`, "error");
    }
    await loadArchivedDogs();
    syncAll(0);
    setBusyId(null);
  }

  async function deleteDog(dog) {
    if (!confirm(`Permanently delete ${dog.dog_name}? This can't be undone - consider Archive instead.`)) return;
    setBusyId(dog.id);
    const beforeArchived = archivedDogs;
    setArchivedDogs((prev) => prev.filter((d) => d.id !== dog.id));
    let ok = false;
    try {
      ok = (await fetch(`/api/dogs/${dog.id}`, { method: "DELETE" })).ok;
    } catch {}
    if (ok) showToast(`${dog.dog_name} permanently deleted`);
    else {
      setArchivedDogs(beforeArchived);
      showToast(`Could not delete ${dog.dog_name}.`, "error");
    }
    await loadArchivedDogs();
    syncAll(0);
    setBusyId(null);
  }

  // Same builder the cron job uses, so the preview is exactly what the owner gets.
  function previewEmail(dog, comp) {
    return buildReminderEmail({
      items: [{ dog, comp }],
      business: { name: profile.businessName, phone: profile.businessPhone },
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    });
  }

  function copyReminder(dog, comp) {
    const text = previewEmail(dog, comp).text;
    navigator.clipboard?.writeText(text);
    showToast("Reminder text copied ✓");
  }

  // Hand-written message for the "Message" panel: opens the groomer's own
  // WhatsApp with the text typed. Used for lapsed clients and anyone you want to nudge.
  function manualMessage(dog, comp, view) {
    const base = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const text = manualMessageText({
      dog,
      view,
      businessName: profile.businessName,
      dueLabel: comp.due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      bookingUrl: dog.booking_token && base ? `${base}/book/${dog.booking_token}` : "",
    });
    return { text, url: whatsappUrl(dog.phone, text) };
  }

  function showLapsed() {
    setActiveView("dogs");
    setFilter("lapsed");
    setNotifOpen(false);
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
    const today = dayKey(new Date(), timezone);
    dogsReq.current++;
    setDogs((prev) => prev.map((d) => (ids.includes(d.id) ? { ...d, last_groom_date: today } : d)));
    setSelectedIds(new Set());
    await Promise.all(ids.map((id) => fetch(`/api/dogs/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markGroomedToday: true }),
    }).catch(() => null)));
    showToast(`${ids.length} dog${ids.length === 1 ? "" : "s"} marked as groomed today ✓`);
    syncAll(0);
    setBusyId(null);
  }

  async function bulkArchive() {
    const ids = [...selectedIds];
    setBusyId("bulk");
    dogsReq.current++;
    setDogs((prev) => prev.filter((d) => !ids.includes(d.id)));
    setSelectedIds(new Set());
    await Promise.all(ids.map((id) => fetch(`/api/dogs/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: true }),
    }).catch(() => null)));
    showToast(`${ids.length} dog${ids.length === 1 ? "" : "s"} archived`);
    syncAll(0);
    setBusyId(null);
  }

  const withComp = dogs.map((d) => {
    const comp = computeStatus(d, new Date(), timezone);
    // "view" is what the groomer sees: overdue turns into lapsed after 30 days.
    const view = comp.status === "overdue" && comp.daysLeft < -LAPSED_AFTER_DAYS ? "lapsed" : comp.status;
    return { dog: d, comp, view };
  });
  const counts = { overdue: 0, soon: 0, ok: 0, lapsed: 0 };
  withComp.forEach((x) => counts[x.view]++);

  const needsAttention = [...withComp]
    .filter((x) => x.view === "overdue" || x.view === "soon")
    .sort((a, b) => a.comp.daysLeft - b.comp.daysLeft);

  const lapsedRows = withComp
    .filter((x) => x.view === "lapsed")
    .sort((a, b) => b.comp.daysLeft - a.comp.daysLeft);
  const noEmailCount = dogs.filter((d) => !d.owner_email).length;
  const overdueRows = withComp.filter((x) => x.view === "overdue").sort((a, b) => a.comp.daysLeft - b.comp.daysLeft);
  const failedRows = withComp.filter((x) => x.dog.last_reminder_result === "failed");
  const noEmailRows = withComp.filter((x) => !x.dog.owner_email);
  const winbackDraft = (dog, comp) =>
    manualMessageText({
      dog,
      view: "lapsed",
      businessName: profile.businessName,
      dueLabel: comp.due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      bookingUrl: "", // the email adds its own Book button
    });
  const openClients = (f) => { setFilter(f); setActiveView("dogs"); };

  const setupSteps = [
    { key: "name", title: "Add your salon name", hint: "It shows on reminders and booking emails.", done: !!(profile.businessName || "").trim(), actionLabel: "Add", onAction: () => { setSettingsTab("business"); setActiveView("settings"); } },
    { key: "dogs", title: "Add your dogs", hint: "Add one by one or import a CSV.", done: dogs.length > 0, actionLabel: "Import CSV", onAction: () => setImportOpen(true) },
    // Only offered once the services table exists (servicesCount is null until then).
    ...(servicesCount === null
      ? []
      : [{ key: "services", title: "Add your services and prices", hint: "Clients pick from your menu when they book.", done: servicesCount > 0, actionLabel: "Add", onAction: () => { setSettingsTab("services"); setActiveView("settings"); } }]),
  ];
  const shownBookings = bookingScope === "past" ? pastBookings : bookings;
  const bookingsHaveService = shownBookings.some((b) => b.service_name);
  const homeReady = !isLoading && bookingsReady && settingsReady && servicesReady;
  const stats = weekStats(dogs, bookings);
  const failedDogs = failedReminderDogs(dogs);
  const upcoming = comingUp(withComp, timezone);
  const todayCount = bookings.filter((b) => dayKey(b.slot_at, timezone) === dayKey(new Date(), timezone)).length;

  let filtered = filter === "all"
    ? withComp
    : filter === "noemail"
      ? withComp.filter((x) => !x.dog.owner_email)
      : filter === "failed"
        ? withComp.filter((x) => x.dog.last_reminder_result === "failed")
        : withComp.filter((x) => x.view === filter);
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
        rows: filtered.filter((x) => x.view === status).sort((a, b) => a.comp.daysLeft - b.comp.daysLeft),
      }))
      .filter((g) => g.rows.length > 0);
  }, [filtered, groupBy]);

  const visibleIds = filtered.map((x) => x.dog.id);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // shortLabel is what the mobile bottom nav renders - 6 destinations is
  // already a lot for a phone-width bar, so each gets a tighter word
  // ("Hours" instead of "Availability") rather than wrapping or truncating.
  const NAV_ITEMS = [
    { key: "home", group: "main", label: "Home", shortLabel: "Home", icon: IconHome, badge: needsAttention.length, mobile: true },
    { key: "dogs", group: "main", label: "Clients", shortLabel: "Clients", icon: IconPaw, mobile: true },
    { key: "bookings", group: "main", label: "Bookings", shortLabel: "Bookings", icon: IconCalendar, badge: bookings.length, mobile: true },
    { key: "analytics", group: "main", label: "Insights", shortLabel: "Insights", icon: IconChart, mobile: true },
    { key: "archived", group: "main", label: "Archive", shortLabel: "Archive", icon: IconInbox, mobile: false },
    { key: "settings", group: "account", label: "Settings", shortLabel: "Settings", icon: IconSettings, mobile: true },
    { key: "billing", group: "account", label: "Plan and billing", shortLabel: "Billing", icon: IconCard, mobile: false },
  ];
  const openSettings = (tab) => { setSettingsTab(tab || "business"); setActiveView("settings"); setProfileOpen(false); };

  const VIEW_TITLE = {
    home: "Home", dogs: "Clients", analytics: "Insights", bookings: "Bookings", settings: "Settings",
    archived: "Archive", billing: "Plan and billing",
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
          <span className="pd-sidebar-brand">PawDue</span>
        </div>
        <nav className="pd-sidebar-nav" aria-label="Main">
          <div className="pd-sidebar-group">Manage</div>
          {NAV_ITEMS.filter((i) => i.group === "main").map((item) => (
            <button
              key={item.key}
              className={`pd-sidebar-btn ${activeView === item.key ? "active" : ""}`}
              onClick={() => setActiveView(item.key)}
              aria-current={activeView === item.key ? "page" : undefined}
            >
              <item.icon />
              <span className="pd-sidebar-label">{item.label}</span>
              {!!item.badge && <span className="pd-sidebar-badge">{item.badge}</span>}
            </button>
          ))}
          <div className="pd-sidebar-group">Account</div>
          {NAV_ITEMS.filter((i) => i.group === "account").map((item) => (
            <button
              key={item.key}
              className={`pd-sidebar-btn ${activeView === item.key ? "active" : ""}`}
              onClick={() => (item.key === "settings" ? openSettings(settingsTab) : setActiveView(item.key))}
              aria-current={activeView === item.key ? "page" : undefined}
            >
              <item.icon />
              <span className="pd-sidebar-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="pd-sidebar-bottom">
          {billing && (
            <div className="pd-sidebar-plan">
              <b>{billing.planName} plan</b>
              <span>{billing.dogCount}{billing.limit === Infinity ? "" : ` of ${billing.limit}`} dogs</span>
              {billing.limit !== Infinity && <div className="pd-sidebar-meter"><div style={{ width: `${Math.min(100, (billing.dogCount / billing.limit) * 100)}%` }} /></div>}
              {!billing.hasBillingAccount && <Link className="link" href="/pricing" style={{ marginTop: 8, fontWeight: 700 }}>Upgrade plan</Link>}
            </div>
          )}
          <Link className="pd-sidebar-btn" href="/help"><IconHelp /><span className="pd-sidebar-label">Help</span></Link>
          <button className="pd-sidebar-btn" onClick={handleSignOut}><IconLogout /><span className="pd-sidebar-label">Log out</span></button>
        </div>
      </aside>

      {/* ---------- Mobile bottom nav (replaces the sidebar below the
          breakpoint - see .pd-bottomnav / .pd-sidebar in globals.css).
          Renders the same NAV_ITEMS so the two stay in sync automatically;
          CSS alone decides which one is actually visible. ---------- */}
      <nav className="pd-bottomnav">
        {NAV_ITEMS.filter((i) => i.mobile).map((item) => (
          <button
            key={item.key}
            className={`pd-bottomnav-btn ${activeView === item.key ? "active" : ""}`}
            onClick={() => (item.key === "settings" ? openSettings(settingsTab) : setActiveView(item.key))}
            aria-label={item.label}
          >
            <item.icon width={20} height={20} />
            {!!item.badge && <span className="pd-bottomnav-badge">{item.badge}</span>}
            <span className="pd-bottomnav-label">{item.shortLabel}</span>
          </button>
        ))}
      </nav>

      {/* ---------- Main ---------- */}
      <main className="pd-main">
        <div className="pd-topbar">
          <div>
            <h1>{VIEW_TITLE[activeView]}</h1>
            <div className="pd-topbar-date">{today}</div>
          </div>
          <div className="pd-topbar-actions">
            {(activeView === "home" || activeView === "dogs") && (
              <button className="pd-add-btn" onClick={openAddModal} aria-label="Add dog">
                <IconPlus width={16} height={16} /> <span>Add dog</span>
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
                  {counts.lapsed > 0 && (
                    <button className="notif-lapsed" onClick={showLapsed}>
                      {counts.lapsed} lapsed client{counts.lapsed === 1 ? "" : "s"} (no auto reminders). Tap to view
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="pd-profile" ref={profileRef} onClick={() => setProfileOpen((o) => !o)}>
              <Avatar name={userEmail || "P D"} size={30} />
              <div className="pd-profile-text">
                <div className="pd-profile-name">{userEmail}</div>
                <div className="pd-profile-sub">{billing?.planName || "Free"} plan</div>
              </div>
              <IconChevronDown width={14} height={14} />
              {profileOpen && (
                <div className="pd-profile-dropdown">
                  <div className="pd-profile-email">{userEmail}</div>
                  <button onClick={() => openSettings("business")}><IconSettings /> Settings</button>
                  <button onClick={() => setActiveView("billing")}><IconCard /> Plan and billing</button>
                  <Link href="/help" onClick={() => setProfileOpen(false)}><IconHelp /> Help</Link>
                  <button onClick={handleSignOut}><IconLogout /> Log out</button>
                  <button onClick={() => { setProfileOpen(false); setDeleteModalOpen(true); }} className="pd-danger-item">
                    <IconTrash /> Delete account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <SetupBanner hideKeys={activeView === "home" && dogs.length > 0 ? ["dogs_without_channel"] : []} />

        {billing && activeView !== "billing" && (
          <div className="usage-bar">
            <div className="usage-label">
              <b>{billing.planName} plan</b> · {billing.dogCount}
              {billing.limit === Infinity ? "" : ` / ${billing.limit}`} dogs used
            </div>
            {!billing.hasBillingAccount && <Link className="link" href="/pricing">Upgrade plan</Link>}
          </div>
        )}

        {/* ---------- Home view ---------- */}
        {activeView === "home" && (
          <>
            {!homeReady && (<><div className="skeleton-card" style={{ height: 64 }} /><div className="skeleton-card" style={{ height: 150, marginTop: 14 }} /></>)}
            {homeReady && (
              <HomeHeader
                timezone={timezone}
                todayCount={todayCount}
                hasDogs={dogs.length > 0}
                paused={autopilotPaused}
                pauseAvailable={autopilotAvailable}
                pauseBusy={pauseBusy}
                onTogglePause={toggleAutopilot}
              />
            )}
            {homeReady && autopilotPaused && dogs.length > 0 && <PausedNotice onResume={toggleAutopilot} busy={pauseBusy} />}
            {homeReady && <GetStarted steps={setupSteps} />}
            {homeReady && dogs.length > 0 && (
              <RecoveredHero stats={stats} refreshKey={syncKey} onOpenServices={() => openSettings("services")} />
            )}
            {homeReady && dogs.length > 0 && (
              <NeedsYou
                lapsedRows={lapsedRows}
                overdueRows={overdueRows}
                failedRows={failedRows}
                noEmailRows={noEmailRows}
                messageFor={(dog, comp, view) => manualMessage(dog, comp, view)}
                busyId={busyId}
                onGroomed={markGroomed}
                onEditDog={openEditModal}
                onReviewAndSend={() => setWinbackOpen(true)}
                onViewClients={openClients}
              />
            )}
            {homeReady && dogs.length > 0 && (
              <div className="pd-home-cols">
                <TodaySchedule bookings={bookings} dogs={dogs} timezone={timezone} busyId={busyId} onGroomed={markGroomed} onOpenBookings={() => setActiveView("bookings")} />
                <div className="pd-home-side">
                  <ComingUp items={upcoming} onShowSoon={() => openClients("soon")} />
                  <ActivityFeed dogs={dogs} bookings={bookings} />
                </div>
              </div>
            )}
          </>
        )}

        {/* ---------- Clients view (the full dog list) ---------- */}
        {activeView === "dogs" && (
          <>

            {(filter === "noemail" || filter === "failed") && (
              <div className="pd-lapsed-note">
                {filter === "failed" ? "Showing dogs whose last reminder failed." : "Showing dogs with no owner email."} <button className="link-btn" onClick={() => setFilter("all")}>Show all</button>
              </div>
            )}

            <div className="pd-stat-chips">
              <div className={`pd-stat-chip overdue ${filter === "overdue" ? "is-active" : ""}`} role="button" tabIndex={0} onClick={() => setFilter(filter === "overdue" ? "all" : "overdue")} onKeyDown={(e) => e.key === "Enter" && setFilter(filter === "overdue" ? "all" : "overdue")}>
                <div>
                  <div className="pd-stat-chip-num">{counts.overdue}</div>
                  <div className="pd-stat-chip-label">Overdue</div>
                </div>
              </div>
              <div className={`pd-stat-chip soon ${filter === "soon" ? "is-active" : ""}`} role="button" tabIndex={0} onClick={() => setFilter(filter === "soon" ? "all" : "soon")} onKeyDown={(e) => e.key === "Enter" && setFilter(filter === "soon" ? "all" : "soon")}>
                <div>
                  <div className="pd-stat-chip-num">{counts.soon}</div>
                  <div className="pd-stat-chip-label">Due soon</div>
                </div>
              </div>
              <div className={`pd-stat-chip ok ${filter === "ok" ? "is-active" : ""}`} role="button" tabIndex={0} onClick={() => setFilter(filter === "ok" ? "all" : "ok")} onKeyDown={(e) => e.key === "Enter" && setFilter(filter === "ok" ? "all" : "ok")}>
                <div>
                  <div className="pd-stat-chip-num">{counts.ok}</div>
                  <div className="pd-stat-chip-label">On track</div>
                </div>
              </div>
              {counts.lapsed > 0 && (
                <div className={`pd-stat-chip lapsed ${filter === "lapsed" ? "is-active" : ""}`} role="button" tabIndex={0} title={LAPSED_HINT} onClick={() => setFilter(filter === "lapsed" ? "all" : "lapsed")} onKeyDown={(e) => e.key === "Enter" && setFilter(filter === "lapsed" ? "all" : "lapsed")}>
                  <div>
                    <div className="pd-stat-chip-num">{counts.lapsed}</div>
                    <div className="pd-stat-chip-label">Lapsed (no auto reminders)</div>
                  </div>
                </div>
              )}
            </div>

            <div className="pd-dogs-tools">
              <button className="small ghost" onClick={() => setActiveView("archived")}>Archive</button>
              <button className="small ghost" onClick={() => setImportOpen(true)}>Import CSV</button>
              <button className="small ghost" onClick={() => { window.location.href = "/api/dogs/export"; }}>Export CSV</button>
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
                  <option value="lapsed">Lapsed</option>
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
                  {search ? "No dogs match your search." : "No dogs here yet. Tap Add dog to add one."}
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
                  <div className="pd-thead-selectall">Select all</div>
                </div>

                {groups.map((group) => (
                  <div key={group.key}>
                    {group.label && <div className="pd-trow-group">{group.label} · {group.rows.length}</div>}
                    {group.key === "lapsed" && <div className="pd-lapsed-note">{LAPSED_HINT}</div>}
                    {group.rows.map(({ dog, comp, view }) => (
                      <div key={dog.id}>
                        <div className="pd-trow">
                          <input className="pd-tcheck" type="checkbox" checked={selectedIds.has(dog.id)} onChange={() => toggleSelect(dog.id)} aria-label={`Select ${dog.dog_name}`} />
                          <div className="pd-tcell-dog">
                            <Avatar name={dog.dog_name} size={32} />
                            <div style={{ minWidth: 0 }}>
                              <div className="pd-tcell-dog-name">
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
                          <div className="pd-tcell-status">
                            <span className={`badge ${view}`} title={view === "lapsed" ? LAPSED_HINT : undefined}>{STATUS_LABEL[view]}</span>
                          </div>
                          <div className="pd-tcell-actions">
                            <button className="pd-row-action" title="Preview the reminder email or message the owner on WhatsApp" onClick={() => setOpenMsgId(openMsgId === dog.id ? null : dog.id)}>
                              <IconMessage /><span>Message</span>
                            </button>
                            <button className="pd-row-action is-primary" title="Mark groomed today" onClick={() => markGroomed(dog)} disabled={busyId === dog.id}>
                              <IconCheck /><span>Groomed</span>
                            </button>
                            <button className="pd-row-action" title="Edit this dog" onClick={() => openEditModal(dog)} disabled={busyId === dog.id}>
                              <IconPencil /><span>Edit</span>
                            </button>
                            <button className="pd-row-action" title="Archive this dog" onClick={() => archiveDog(dog)} disabled={busyId === dog.id}>
                              <IconArchive /><span>Archive</span>
                            </button>
                          </div>
                        </div>
                        {openMsgId === dog.id && (
                          <div className="msgbox" style={{ margin: "0 16px 12px" }}>
                            {(() => {
                              const m = manualMessage(dog, comp, view);
                              return (
                                <div className="pd-wa-box">
                                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Message on WhatsApp</div>
                                  {dog.opted_out ? (
                                    <p className="sub" style={{ margin: 0 }}>This owner opted out of reminders, so please do not message them.</p>
                                  ) : !m.url ? (
                                    <p className="sub" style={{ margin: 0 }}>Add the country code to this phone number (like +1 or +91) to message on WhatsApp.</p>
                                  ) : (
                                    <>
                                      <div style={{ whiteSpace: "pre-wrap", marginBottom: 10 }}>{m.text}</div>
                                      <a className="pd-wa-btn" href={m.url} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>
                                      <span className="sub" style={{ marginLeft: 10, fontSize: ".74rem" }}>Opens your own WhatsApp with this text ready. You press send.</span>
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                            <div style={{ fontWeight: 700, margin: "16px 0 6px" }}>Reminder email preview</div>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>Subject: {previewEmail(dog, comp).subject}</div>
                            <div style={{ whiteSpace: "pre-wrap" }}>{previewEmail(dog, comp).text}</div>
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
            <ServiceInsights
              refreshKey={syncKey}
              onOpenBookings={() => { changeBookingScope("past"); setActiveView("bookings"); }}
              onOpenServices={() => openSettings("services")}
            />
            <RevenueChart refreshKey={syncKey} />
            <StatusDonut counts={counts} />
            <ReminderBreakdown dogs={dogs} />
            <ActivityFeed dogs={dogs} bookings={bookings} />
          </div>
        )}

        {/* ---------- Bookings view ---------- */}
        {activeView === "bookings" && (
          <>
            <div className="pd-bk-tabs" role="tablist" aria-label="Bookings">
              <button role="tab" aria-selected={bookingScope === "upcoming"} className={bookingScope === "upcoming" ? "is-on" : ""} onClick={() => changeBookingScope("upcoming")}>Upcoming</button>
              <button role="tab" aria-selected={bookingScope === "past"} className={bookingScope === "past" ? "is-on" : ""} onClick={() => changeBookingScope("past")}>Past 90 days</button>
            </div>
            <div className="pd-table">
              {shownBookings.length === 0 ? (
                <div className="pd-tempty">
                  {bookingScope === "past"
                    ? "No past bookings in the last 90 days."
                    : "No upcoming bookings yet. They'll show up here the moment an owner books through their reminder link."}
                </div>
              ) : (
                <>
                  <div className={`pd-trow pd-thead pd-trow-bk${bookingsHaveService ? " has-svc" : ""}`}>
                    <div>Dog</div>
                    <div>Owner</div>
                    {bookingsHaveService && <div>Service</div>}
                    <div>When</div>
                    <div>Status</div>
                  </div>
                  {shownBookings.map((b) => (
                    <div className={`pd-trow pd-trow-bk${bookingsHaveService ? " has-svc" : ""}`} key={b.id}>
                      <div className="pd-tcell-dog pd-bk-dog">
                        <Avatar name={b.dogs?.dog_name || "?"} size={32} />
                        <div>
                          <div className="pd-tcell-dog-name">{b.dogs?.dog_name}</div>
                          <div className="pd-tcell-dog-breed">{b.dogs?.breed}</div>
                        </div>
                      </div>
                      <div className="pd-bk-owner">
                        {b.dogs?.owner_name}
                        {b.dogs?.phone && <div className="pd-tcell-due-sub">{b.dogs.phone}</div>}
                      </div>
                      {bookingsHaveService && (
                        <div className="pd-bk-svc">
                          {b.service_name ? describeBooking(b).withSize : <span className="sub">Not chosen</span>}
                          {b.price != null && <div className="pd-tcell-due-sub">{moneyText(b.price, b.currency, b.price_is_starting)}{b.addons?.length ? ` incl. ${b.addons.map((a) => a.name).join(", ")}` : ""}</div>}
                        </div>
                      )}
                      <div className="pd-tcell-due pd-bk-when">
                        {new Date(b.slot_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: timezone })}
                        <div className="pd-tcell-due-sub">{new Date(b.slot_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone })}</div>
                      </div>
                      <div className="pd-bk-status">
                        <span className="badge ok">{bookingScope === "past" ? "done" : b.status}</span>
                        {bookingScope === "upcoming" && Date.now() - new Date(b.created_at).getTime() < 24 * 3600 * 1000 && <span className="badge" style={{ marginLeft: 6 }}>New</span>}
                        {b.paid_at ? (
                          <div className="pd-bk-paid" translate="no">
                            {paidSummary(b, timezone)}
                            {b.receipt_sent_at ? " · receipt sent" : ""}
                            {" "}<button className="link" style={{ background: "none", border: "none", padding: 0, font: "inherit" }} onClick={() => markUnpaid(b)}>Undo</button>
                          </div>
                        ) : (
                          <div className="pd-bk-actions">
                            <button className="ghost" onClick={() => setMarkPaid(b)}>Mark paid</button>
                            {bookingScope === "upcoming" && <button className="ghost" onClick={() => cancelBooking(b)}>Cancel</button>}
                          </div>
                        )}
                        {b.paid_at && bookingScope === "upcoming" && (
                          <div className="pd-bk-actions"><button className="ghost" onClick={() => cancelBooking(b)}>Cancel</button></div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            {markPaid && <MarkPaidModal booking={markPaid} onClose={() => setMarkPaid(null)} onSaved={paymentSaved} />}
          </>
        )}

        {/* ---------- Archived view ---------- */}
        {activeView === "archived" && (
          <div className="pd-table">
            {archivedDogs.length === 0 ? (
              <div className="pd-tempty">No archived dogs.</div>
            ) : (
              <>
                <div className="pd-trow pd-thead pd-trow-arch">
                  <div>Dog</div>
                  <div className="pd-thead-owner">Owner</div>
                  <div style={{ textAlign: "right" }}>Actions</div>
                </div>
                {archivedDogs.map((dog) => (
                  <div className="pd-trow pd-trow-arch" key={dog.id}>
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
                        <IconRestore /><span>Restore</span>
                      </button>
                      <button className="pd-row-action" title="Delete permanently" onClick={() => deleteDog(dog)} disabled={busyId === dog.id}>
                        <IconTrash /><span>Delete</span>
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
        {activeView === "settings" && (
          <div className="pd-settings-wrap">
          <div className="pd-tabs" role="tablist" aria-label="Settings sections">
            {[["autopilot", "Autopilot"], ["business", "Business"], ["services", "Services"], ["hours", "Booking hours"], ["calendar", "Calendar"], ["account", "Account"]].map(([k, label]) => (
              <button key={k} role="tab" aria-selected={settingsTab === k} className={`pd-tab ${settingsTab === k ? "active" : ""}`} onClick={() => setSettingsTab(k)}>{label}</button>
            ))}
          </div>
          <div className="pd-settings-grid pd-settings-single">
          {settingsTab === "autopilot" && (
          <div className="pd-settings-col">
            <div className={`pd-ap-status ${autopilotPaused ? "is-paused" : ""}`}>
              <div>
                <b>{autopilotPaused ? "Autopilot is paused" : "Autopilot is on"}</b>
                <div className="sub">
                  {autopilotPaused
                    ? "No automatic reminders are going out. Bookings and your calendar keep working."
                    : "PawDue is sending reminders for you. Pause it any time, for example on holiday."}
                </div>
              </div>
              <button className={autopilotPaused ? "small" : "small ghost"} onClick={toggleAutopilot} disabled={pauseBusy}>
                {autopilotPaused ? "Resume reminders" : "Pause reminders"}
              </button>
            </div>

            <div className="card pd-set-card">
              <h3 className="pd-set-title">What PawDue does for you</h3>
              <p className="sub pd-set-sub">These run on their own. You do not need to switch anything on.</p>
              <ul className="pd-ap-list">
                <li><b>Emails owners when a dog is due.</b> Based on each breed's usual grooming cycle, at most 3 reminders per cycle.</li>
                <li><b>Skips dogs that already booked,</b> and anyone who chose to stop reminders.</li>
                <li><b>Stops after 30 days overdue</b> so nobody gets nagged. Those clients show up on Home for you to message.</li>
                <li><b>Confirms every booking by email</b> to you and the owner, and adds it to your calendar.</li>
                <li><b>Keeps your dashboard up to date</b> the moment someone books or cancels.</li>
              </ul>
            </div>

            <div className="card pd-set-card">
              <h3 className="pd-set-title">What needs your tap</h3>
              <p className="sub pd-set-sub" style={{ marginBottom: 0 }}>
                Clients who went quiet are never emailed without you. On Home, open <b>Needs you</b>, then <b>Review and send emails</b>, edit anything you like and send.
              </p>
            </div>

            <div className="card pd-set-card">
              <h3 className="pd-set-title">What your clients see</h3>
              <p className="sub pd-set-sub">Preview of a reminder email, sent under your salon name.</p>
              <div className="pd-ap-preview">
                <div className="pd-ap-preview-salon">{profile.businessName || "Your salon name"}</div>
                <div className="pd-ap-preview-title">Time to book Bella&apos;s next groom</div>
                <div>Hi Emma, Bella is due for her groom around 12 November. Pick a time that suits you.</div>
                <div className="pd-ap-preview-btn">Book a time</div>
              </div>
              {!(profile.businessName || "").trim() && (
                <p className="sub" style={{ margin: "12px 0 0" }}>
                  Add your salon name in <button className="link-btn" onClick={() => setSettingsTab("business")}>Business</button> so owners see your name here.
                </p>
              )}
            </div>

            <div className="card pd-set-card">
              <h3 className="pd-set-title">Not built yet</h3>
              <ul className="pd-ap-list is-muted">
                <li>Choosing how early reminders go out (1 week, 3 days, due day)</li>
                <li>Approving booking requests outside your hours</li>
                <li>A Monday summary email</li>
              </ul>
            </div>
          </div>
          )}

          {settingsTab === "hours" && (
          <div className="card pd-set-card">
            {!availability ? (
              <div className="skeleton-card" />
            ) : (
              <>
                <h3 className="pd-set-title">Booking hours</h3>
                <p className="sub pd-set-sub">
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

                <div className="pd-set-actions">
                  <button onClick={saveAvailability} disabled={availabilitySaving}>
                    {availabilitySaving ? "Saving…" : "Save availability"}
                  </button>
                </div>
              </>
            )}
          </div>
          )}

          {settingsTab === "business" && (
          <div className="pd-settings-col">
          <BusinessProfileCard profile={profile} onSaved={setProfile} />
          <div className="card pd-set-card">
            <h3 className="pd-set-title">Timezone</h3>
            <p className="sub pd-set-sub">
              Reminders go out in the morning, in this timezone, and each dog&apos;s due date is
              worked out on your local day. Set this to where your salon is.
            </p>
            <LocalTimeNow timezone={timezoneForm} />
            <div className="pd-set-inline">
              <select
                value={timezoneForm}
                onChange={(e) => setTimezoneForm(e.target.value)}
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
          </div>
          )}

          {settingsTab === "services" && <ServicesEditor onToast={showToast} />}
          {settingsTab === "calendar" && (
          <div className="pd-settings-col">
            <CalendarFeedCard />
          </div>
          )}

          {settingsTab === "account" && (
          <div className="pd-settings-col">
            <div className="card pd-set-card">
              <h3 className="pd-set-title">Your account</h3>
              <p className="sub pd-set-sub">Signed in as <b>{userEmail}</b></p>
              <div className="pd-account-row">
                <div><b>{billing?.planName || "Free"} plan</b><div className="sub">{billing ? `${billing.dogCount}${billing.limit === Infinity ? "" : ` of ${billing.limit}`} dogs used` : ""}</div></div>
                <button className="small ghost" onClick={() => setActiveView("billing")}>Plan and billing</button>
              </div>
              <div className="pd-account-row">
                <div><b>Help and contact</b><div className="sub">Guides and how to reach us</div></div>
                <Link className="link" href="/help" style={{ fontWeight: 700 }}>Open help</Link>
              </div>
              <div className="pd-account-row">
                <div><b>Log out</b><div className="sub">On this device</div></div>
                <button className="small ghost" onClick={handleSignOut}>Log out</button>
              </div>
            </div>
            <div className="card pd-set-card pd-danger-zone">
              <h3 className="pd-set-title">Delete account</h3>
              <p className="sub pd-set-sub">Permanently removes your account, dogs and bookings. This cannot be undone.</p>
              <button className="small pd-danger-btn" onClick={() => setDeleteModalOpen(true)}>Delete my account</button>
            </div>
          </div>
          )}
          </div>
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

      {winbackOpen && (
        <WinbackModal
          rows={lapsedRows}
          draftFor={winbackDraft}
          onClose={() => setWinbackOpen(false)}
          onSent={() => syncAll(0)}
        />
      )}

      {importOpen && (
        <ImportDogsModal
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); loadDogs(); }}
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
              This permanently deletes your account, every dog, booking, and setting.
              There&apos;s no undo. Type <b>DELETE</b> below to confirm.
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

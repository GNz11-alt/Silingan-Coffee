import { supabase } from "@/supabase.js";

const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const LAST_REFRESH_KEY = "lastNotificationRefresh";
const CACHE_KEY = "notificationCache";

const UNREAD_LIMIT = 20;
const HISTORY_LIMIT = 30;

function getRole() {
  return localStorage.getItem("role") || "";
}

function getScopeKey(role, branchId) {
  return `${role || "unknown"}:${branchId ?? "all"}`;
}

function getLastRefresh(role, branchId = null) {
  const all = JSON.parse(localStorage.getItem(LAST_REFRESH_KEY) || "{}");
  return Number(all[getScopeKey(role, branchId)] || 0);
}

function setLastRefresh(role, branchId = null, value = Date.now()) {
  const all = JSON.parse(localStorage.getItem(LAST_REFRESH_KEY) || "{}");
  all[getScopeKey(role, branchId)] = value;
  localStorage.setItem(LAST_REFRESH_KEY, JSON.stringify(all));
}

function getCached(role, branchId = null) {
  const all = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  return all[getScopeKey(role, branchId)] || null;
}

function setCached(role, branchId = null, payload) {
  const all = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  all[getScopeKey(role, branchId)] = payload;
  localStorage.setItem(CACHE_KEY, JSON.stringify(all));
}

function clearCached(role, branchId = null) {
  const all = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  delete all[getScopeKey(role, branchId)];
  localStorage.setItem(CACHE_KEY, JSON.stringify(all));
}

function shouldAutoRefresh(role, branchId = null) {
  const last = getLastRefresh(role, branchId);
  return !last || Date.now() - last > REFRESH_INTERVAL_MS;
}

export function useNotifications() {
  /** UTC date string — matches Dashboard.vue: new Date().toISOString().split("T")[0] */
  function utcDateStr() {
    return new Date().toISOString().split('T')[0]
  }

  function baseQuery(role, branchId = null) {
    // Filter to today only using UTC date — same boundary Dashboard.vue uses,
    // so notification counts always match what the dashboard shows.
    const todayStart = `${utcDateStr()}T00:00:00`

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("role", role)
      .gte("created_at", todayStart)
      .order("created_at", { ascending: false });

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }
    return query;
  }

  /** Severity order for client-side sorting: critical first, then high, medium, low. */
  const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 }
  function sortBySeverity(items) {
    return [...items].sort((a, b) => {
      const rankDiff = (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
      if (rankDiff !== 0) return rankDiff
      // Within same severity, newest first
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }

  /**
   * Fetch unread notifications only.
   * Used by layout badges — pass the real branchId for an accurate count.
   */
  async function fetchNotifications(branchId = null, { force = false } = {}) {
    const role = getRole();
    if (!role) return [];

    if (!force && !shouldAutoRefresh(role, branchId)) {
      const cached = getCached(role, branchId);
      if (cached?.unread) return cached.unread;
    }

    const { data, error } = await baseQuery(role, branchId)
      .eq("is_read", false)
      .limit(UNREAD_LIMIT);

    if (error) {
      console.error("[Notifications] fetch failed:", error);
      return [];
    }

    const unread = data || [];
    const existing = getCached(role, branchId) || {};
    setCached(role, branchId, { ...existing, unread, updatedAt: Date.now() });
    setLastRefresh(role, branchId, Date.now());
    return unread;
  }

  /**
   * Fetch all notifications (history tab).
   * Unread is derived client-side to avoid a second round-trip.
   */
  async function fetchAllNotifications(
    branchId = null,
    { force = false } = {},
  ) {
    const role = getRole();
    if (!role) return [];

    if (!force && !shouldAutoRefresh(role, branchId)) {
      const cached = getCached(role, branchId);
      if (cached?.all) return cached.all;
    }

    const { data, error } = await baseQuery(role, branchId).limit(HISTORY_LIMIT);

    if (error) {
      console.error("[Notifications] fetchAll failed:", error);
      return [];
    }

    const all = data || [];
    const existing = getCached(role, branchId) || {};
    setCached(role, branchId, { ...existing, all, updatedAt: Date.now() });
    setLastRefresh(role, branchId, Date.now());
    return all;
  }

  /**
   * Fetch both unread and all in a single query (history already contains unread).
   * Unread is derived from the single "all" result — no duplicate round-trip.
   */
  async function fetchNotificationBundle(
    branchId = null,
    { force = false } = {},
  ) {
    const role = getRole();
    if (!role) return { unread: [], all: [], lastRefresh: 0 };

    if (!force && !shouldAutoRefresh(role, branchId)) {
      const cached = getCached(role, branchId);
      if (cached?.all) {
        const unread = cached.all.filter((n) => !n.is_read);
        return {
          unread,
          all: cached.all,
          lastRefresh: getLastRefresh(role, branchId),
          fromCache: true,
        };
      }
    }

    const { data, error } = await baseQuery(role, branchId).limit(HISTORY_LIMIT);

    if (error) {
      console.error("[Notifications] fetchBundle failed:", error);
      return { unread: [], all: [], lastRefresh: 0 };
    }

    const all = data || [];
    // Derive unread from the same result — no extra query needed
    // Sort by severity so critical/high always surface before medium/low
    const sorted = sortBySeverity(all)
    const unread = sorted.filter((n) => !n.is_read).slice(0, UNREAD_LIMIT);

    setCached(role, branchId, { all: sorted, unread, updatedAt: Date.now() });
    setLastRefresh(role, branchId, Date.now());

    return {
      unread,
      all: sorted,
      lastRefresh: getLastRefresh(role, branchId),
      fromCache: false,
    };
  }

  async function markAsRead(id) {
    const role = getRole();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      console.error("[Notifications] markAsRead failed:", error);
      return;
    }

    // Update cache so a reload within 12 hrs doesn't resurface this item
    if (role) {
      const branchId = localStorage.getItem("branch")
        ? Number(localStorage.getItem("branch"))
        : null;
      const cached = getCached(role, branchId);
      if (cached?.all) {
        const updatedAll = cached.all.map((n) =>
          n.id === id ? { ...n, is_read: true } : n,
        );
        const updatedUnread = updatedAll.filter((n) => !n.is_read).slice(0, UNREAD_LIMIT);
        setCached(role, branchId, {
          ...cached,
          all: updatedAll,
          unread: updatedUnread,
          updatedAt: Date.now(),
        });
      }
    }
  }

  async function markAllAsRead(branchId = null) {    const role = getRole();
    if (!role) return;

    let query = supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("role", role)
      .eq("is_read", false);

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { error } = await query;
    if (error) {
      console.error("[Notifications] markAllAsRead failed:", error);
      return;
    }

    // Invalidate cache so next open fetches fresh data
    clearCached(role, branchId);
  }

  /**
   * Subscribe to real-time INSERT events on the notifications table for a
   * given role + branch. Calls `onNew(record)` whenever a new row lands.
   * Returns a cleanup function — call it in onUnmounted to remove the channel.
   */
  function subscribeToNotifications(role, branchId, onNew) {
    const channelName = `notif-${role}-${branchId ?? 'all'}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `role=eq.${role}`,
        },
        (payload) => {
          const record = payload.new
          // Honour branch scoping: only fire if this record belongs to the
          // current branch (or is a global/admin notification with no branch).
          const recordBranch = record.branch_id ?? null
          const myBranch = branchId ?? null
          if (myBranch !== null && recordBranch !== myBranch) return
          onNew(record)
        },
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  async function addNotification({    branch_id,
    category,
    title,
    message,
    severity = "medium",
    link = null,
    role: roleOverride = null,
  }) {
    const role = roleOverride || getRole();
    if (!role) return;

    // Duplicate prevention: skip if same category+title+role+branch already exists today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dupQuery = supabase
      .from("notifications")
      .select("id")
      .eq("role", role)
      .eq("category", category)
      .eq("title", title)
      .gte("created_at", today.toISOString())
      .limit(1);

    if (branch_id != null) {
      dupQuery = dupQuery.eq("branch_id", branch_id);
    } else {
      dupQuery = dupQuery.is("branch_id", null);
    }

    const { data: existing } = await dupQuery;
    if (existing && existing.length > 0) return;

    const record = {
      role,
      branch_id,
      category,
      title,
      message,
      severity,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    if (link) record.link = link;

    const { error } = await supabase.from("notifications").insert(record);
    if (error) console.error("[Notifications] addNotification failed:", error);
  }

  return {
    fetchNotifications,
    fetchAllNotifications,
    fetchNotificationBundle,
    markAsRead,
    markAllAsRead,
    addNotification,
    shouldAutoRefresh,
    getLastRefresh,
    subscribeToNotifications,
    sortBySeverity,
  };
}
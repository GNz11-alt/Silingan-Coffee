import { supabase } from "@/supabase.js";

const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const LAST_REFRESH_KEY = "lastNotificationRefresh";
const CACHE_KEY = "notificationCache";

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

function shouldAutoRefresh(role, branchId = null) {
  const last = getLastRefresh(role, branchId);
  return !last || Date.now() - last > REFRESH_INTERVAL_MS;
}

export function useNotifications() {
  function baseQuery(role, branchId = null) {
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("role", role)
      .order("created_at", { ascending: false })
      .limit(100);

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }
    return query;
  }

  async function fetchNotifications(branchId = null, { force = false } = {}) {
    const role = getRole();
    if (!role) return [];

    if (!force && !shouldAutoRefresh(role, branchId)) {
      const cached = getCached(role, branchId);
      if (cached?.unread) return cached.unread;
    }

    const query = baseQuery(role, branchId).eq("is_read", false).limit(50);
    const { data, error } = await query;
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

    const { data, error } = await baseQuery(role, branchId);
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

  async function fetchNotificationBundle(
    branchId = null,
    { force = false } = {},
  ) {
    const role = getRole();
    if (!role) return { unread: [], all: [], lastRefresh: 0 };

    if (!force && !shouldAutoRefresh(role, branchId)) {
      const cached = getCached(role, branchId);
      if (cached?.unread && cached?.all) {
        return {
          unread: cached.unread,
          all: cached.all,
          lastRefresh: getLastRefresh(role, branchId),
          fromCache: true,
        };
      }
    }

    const [unread, all] = await Promise.all([
      fetchNotifications(branchId, { force: true }),
      fetchAllNotifications(branchId, { force: true }),
    ]);
    return {
      unread,
      all,
      lastRefresh: getLastRefresh(role, branchId),
      fromCache: false,
    };
  }

  async function markAsRead(id) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    if (error) console.error("[Notifications] markAsRead failed:", error);
  }

  async function markAllAsRead(branchId = null) {
    const role = getRole();
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
    if (error) console.error("[Notifications] markAllAsRead failed:", error);
  }

  async function addNotification({
    branch_id,
    category,
    title,
    message,
    severity = "medium",
    link = null,
    role: roleOverride = null,
  }) {
    const role = roleOverride || getRole();
    if (!role) return;

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
  };
}

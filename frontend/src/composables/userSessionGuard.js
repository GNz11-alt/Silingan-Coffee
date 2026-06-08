// src/composables/useSessionGuard.js
import { onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/supabase.js";

export function useSessionGuard() {
  const router = useRouter();
  let interval = null;

  const check = async () => {
    const userId = localStorage.getItem("userId");
    const loginTime = localStorage.getItem("loginTime");
    if (!userId || !loginTime) return;

    const { data } = await supabase
      .from("users")
      .select("force_logout_at")
      .eq("id", userId)
      .maybeSingle();

    if (data?.force_logout_at) {
      const forcedAt = new Date(data.force_logout_at).getTime();
      const loggedInAt = new Date(loginTime).getTime();

      if (forcedAt > loggedInAt) {
        // This session predates the password change — force logout
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("username");
        localStorage.removeItem("role");
        localStorage.removeItem("branch");
        localStorage.removeItem("userId");
        localStorage.removeItem("loginTime");
        router.push("/login");
      }
    }
  };

  onMounted(() => {
    check();
    interval = setInterval(check, 15000); // check every 15 seconds
  });

  onUnmounted(() => clearInterval(interval));
}

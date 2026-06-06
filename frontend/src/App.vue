<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/supabase.js";

const router = useRouter();
let intervalId: ReturnType<typeof setInterval> | null = null;

const checkArchiveStatus = async () => {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  const { data: user } = await supabase
    .from("users")
    .select("employee_id")
    .eq("id", userId)
    .maybeSingle();

  if (!user?.employee_id) return;

  const { data: employee } = await supabase
    .from("employee")
    .select("Status")
    .eq("EmployeeId", user.employee_id)
    .maybeSingle();

  if (employee?.Status === "Archived") {
    localStorage.clear();
    router.push("/login");
  }
};

onMounted(() => {
  intervalId = setInterval(checkArchiveStatus, 30000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <router-view />
</template>

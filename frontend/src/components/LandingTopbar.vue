<script setup>
import logo from "@/assets/images/logo.png";
import { themeColor } from "@/data/items";
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top py-3">
    <div class="container d-flex align-items-center justify-content-between">
      
      <!-- LEFT SIDE: LOGO + TEXT -->
      <div class="d-flex align-items-center">
        <div class="logo-wrapper me-3">
           <img :src="logo" alt="Logo" class="img-fluid" style="height: 60px; width: auto;" />
        </div>
        
        <div class="d-flex flex-column justify-content-center text-start">
          <span class="brand-title">Silingan Coffee</span>
          <span class="brand-subtitle text-muted">Management System</span>
        </div>
      </div>

      <!-- RIGHT SIDE: LOGIN BUTTON -->
      <div class="ms-auto">
        <router-link 
          to="/login" 
          class="btn px-4 fw-bold text-white shadow-sm"
          :style="{ backgroundColor: themeColor, borderRadius: '8px', padding: '10px 25px' }"
        >
          Login
        </router-link>
      </div>

    </div>
  </nav>
</template>

<style scoped>
/* Force the title and subtitle to look right */
.brand-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #4b3832;
  line-height: 1;
  display: block;
}

.brand-subtitle {
  font-size: 0.85rem;
  font-weight: 500;
  display: block;
  margin-top: 2px;
}

/* Ensure the navbar takes full width */
.navbar {
  width: 100%;
  display: block;
}

/* If the image is still broken, this helps you see where it should be */
.logo-wrapper {
  min-width: 60px;
  display: flex;
  align-items: center;
}
</style>
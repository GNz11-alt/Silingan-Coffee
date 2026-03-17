<script setup>
import logo from "@/assets/images/logo.png";

defineProps({
  imgHeight: {
    type: String,
    default: "60px" 
  },
  titleSize: {
    type: String,
    default: "1.5rem"
  },
  subtitleSize: {
    type: String,
    default: "0.9rem"
  }
});
</script>

<template>
  <div class="d-flex align-items-center logo-lockup">
  
    <img :src="logo" alt="Logo" :style="{ height: imgHeight }" class="me-3" />
    

    <div class="d-flex flex-column justify-content-center text-start">
      <span class="brand-title" :style="{ fontSize: titleSize }">Silingan Coffee</span>
      <span class="brand-subtitle" :style="{ fontSize: subtitleSize }">Management System</span>
    </div>
  </div>
</template>

<style scoped>
.brand-title {
  font-weight: 700;
  color: #4b3832;
  line-height: 1;
  margin-bottom: 2px;
}

.brand-subtitle {
  color: #8c7b75;
  font-weight: 500;
}
</style>
<template>
  <Teleport to="body">
    <Transition name="overlay-fade">
      <div v-if="isOpen" class="booklet-overlay" @click.self="close">
        <div class="booklet-wrapper">

          <!-- Header -->
          <div class="booklet-header">
            <div class="booklet-header-left">
              <div class="booklet-logo">
                <component :is="BookOpen" :size="16" />
              </div>
              <div>
                <div class="booklet-header-title">User Manual</div>
                <div class="booklet-header-sub">Silingan Coffee Management System</div>
              </div>
            </div>
            <button class="booklet-close" @click="close">
              <component :is="X" :size="18" />
            </button>
          </div>

          <!-- PDF iframe -->
          <iframe
            :src="pdfUrl"
            class="pdf-frame"
            type="application/pdf"
          />

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, watch } from "vue";
import { BookOpen, X } from "lucide-vue-next";

const props = defineProps({
  pdfUrl:     { type: String,  required: true },
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const isOpen = computed({
  get: () => props.modelValue,
  set: v  => emit("update:modelValue", v),
});
const close = () => { isOpen.value = false; };

watch(isOpen, val => {
  document.body.style.overflow = val ? "hidden" : "";
});
</script>

<style scoped>
.booklet-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(6,3,0,.88);
  backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.overlay-fade-enter-active { transition: opacity .3s ease, transform .3s cubic-bezier(.34,1.56,.64,1); }
.overlay-fade-leave-active { transition: opacity .2s ease; }
.overlay-fade-enter-from   { opacity: 0; transform: scale(.97); }
.overlay-fade-leave-to     { opacity: 0; }

.booklet-wrapper {
  background: #160b03;
  border-radius: 22px;
  box-shadow: 0 50px 120px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.08);
  display: flex; flex-direction: column;
  width: min(96vw, 1000px);
  height: min(96vh, 860px);
  overflow: hidden;
}

.booklet-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,.07); flex-shrink: 0;
}
.booklet-header-left { display: flex; align-items: center; gap: 10px; }
.booklet-logo {
  width: 34px; height: 34px; background: #8b4513; border-radius: 9px;
  display: flex; align-items: center; justify-content: center; color: #fff;
  box-shadow: 0 2px 8px rgba(139,69,19,.5); flex-shrink: 0;
}
.booklet-header-title { font-size: 14px; font-weight: 700; color: #fff; font-family: Inter, sans-serif; }
.booklet-header-sub   { font-size: 11px; color: rgba(255,255,255,.35); margin-top: 2px; font-family: Inter, sans-serif; }
.booklet-close {
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1);
  color: rgba(255,255,255,.6); width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  transition: background .15s, color .15s;
}
.booklet-close:hover { background: rgba(255,255,255,.16); color: #fff; }

.pdf-frame {
  flex: 1; width: 100%; border: none; display: block;
  border-radius: 0 0 22px 22px;
}
</style>
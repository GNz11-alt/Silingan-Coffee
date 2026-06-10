<template>
  <div class="help-page">
    <!-- ── HERO ───────────────────────────────────────────── -->
    <div class="hero-section">
      <div class="hero-icon">
        <component :is="HelpCircle" :size="28" />
      </div>
      <h1 class="hero-title">Help & Support</h1>
      <p class="hero-sub">
        Get assistance with Silingan Coffee Management System
      </p>
    </div>

    <!-- ── MAIN CONTENT ───────────────────────────────────── -->
    <div class="main-layout">
      <!-- ── LEFT COLUMN ──────────────────────────────────── -->
      <div class="left-col">
        <!-- Search -->
        <div class="panel mb-3">
          <div class="panel-header-row">
            <component :is="Search" :size="16" class="panel-icon" />
            <div>
              <div class="panel-title">Search Help Topics</div>
              <div class="panel-sub">Find answers quickly</div>
            </div>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Search help topics, features, or issues..."
          />
        </div>

        <!-- FAQs -->
        <div class="panel">
          <div class="faq-header">
            <div class="panel-title">Frequently Asked Questions</div>
            <div class="panel-sub">Common questions and solutions</div>
          </div>

          <div class="faq-list">
            <div
              v-for="faq in filteredFaqs"
              :key="faq.id"
              class="faq-item"
              :class="{ open: faq.open }"
              @click="toggleFaq(faq)"
            >
              <div class="faq-question">
                <span>{{ faq.question }}</span>
                <component
                  :is="faq.open ? ChevronUp : ChevronDown"
                  :size="18"
                  class="faq-chevron"
                />
              </div>
              <div v-if="faq.open" class="faq-answer">
                {{ faq.answer }}
              </div>
            </div>

            <div
              v-if="filteredFaqs.length === 0"
              class="text-center py-4 text-muted"
              style="font-size: 13px"
            >
              No results found for "{{ searchQuery }}"
            </div>
          </div>
        </div>
      </div>

      <!-- ── RIGHT COLUMN ──────────────────────────────────── -->
      <div class="right-col">
        <!-- Quick Help -->
        <div class="panel mb-3">
          <div class="panel-title mb-1">Quick Help</div>
          <div class="panel-sub mb-3">Popular help topics</div>
          <div class="quick-list">
            <div
              v-for="topic in quickTopics"
              :key="topic.title"
              class="quick-item"
              @click="jumpToFaq(topic.faqId)"
            >
              <div class="quick-icon-wrap">
                <component :is="topic.icon" :size="18" />
              </div>
              <div>
                <div class="quick-title">{{ topic.title }}</div>
                <div class="quick-sub">{{ topic.sub }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Contact Support -->
        <div class="panel mb-3">
          <div class="panel-title mb-1">Contact Support</div>
          <div class="panel-sub mb-3">Get personalized help</div>
          <div class="contact-list">
            <div class="contact-item">
              <div class="contact-icon-wrap">
                <component :is="Phone" :size="16" />
              </div>
              <div>
                <div class="contact-title">Phone Support</div>
                <div class="contact-detail">+63 2 8123-4567</div>
                <div class="contact-detail">Mon-Fri 9AM-6PM</div>
              </div>
            </div>
            <div class="contact-item">
              <div class="contact-icon-wrap">
                <component :is="Mail" :size="16" />
              </div>
              <div>
                <div class="contact-title">Email Support</div>
                <div class="contact-detail">support@silingancoffee.ph</div>
                <div class="contact-detail">Response within 24hrs</div>
              </div>
            </div>
          </div>
        </div>

        <!-- System Status -->
        <div class="panel">
          <div class="panel-title mb-3">System Status</div>
          <div class="status-list">
            <div class="status-row">
              <span class="status-label">System Health</span>
              <span class="badge badge-active">Operational</span>
            </div>
            <div class="status-row">
              <span class="status-label">Last Backup</span>
              <span class="status-val">{{ lastBackupStatus }}</span>
            </div>
            <div class="status-row">
              <span class="status-label">Version</span>
              <span class="status-val">v2.1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── ADDITIONAL RESOURCES ────────────────────────────── -->
    <div class="resources-panel mt-4">
      <div class="panel-title mb-1">Additional Resources</div>
      <div class="panel-sub mb-3">More ways to learn and get help</div>
      <div class="resources-list">
        <!-- User Manual → opens booklet viewer -->
        <div class="resource-item" @click="showManual = true">
          <div class="resource-icon-wrap">
            <component :is="BookOpen" :size="20" />
          </div>
          <div class="resource-text">
            <div class="resource-title">User Manual</div>
            <div class="resource-sub">
              Complete documentation for all modules
            </div>
          </div>
          <span class="resource-arrow">→</span>
        </div>
      </div>
    </div>

    <!-- ── BOOKLET VIEWER ──────────────────────────────────── -->
    <!--
      Replace SUPABASE_PDF_URL with your actual public Supabase Storage URL.
      Example:
        https://abcdefgh.supabase.co/storage/v1/object/public/manuals/user-manual.pdf

      To update the manual, just upload a new PDF to the same path in Supabase Storage.
      The viewer will always fetch the latest version on open.
    -->
    <BookletViewer
      v-model="showManual"
      pdf-url="https://shotdzuirteocjrxiwwq.supabase.co/storage/v1/object/public/manuals/UserManual%20(1).pdf"
    />
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Phone,
  Mail,
  BookOpen,
} from "lucide-vue-next";
import BookletViewer from "@/components/BookletViewer.vue"; // adjust path to where you put the file

const lastBackupStatus = ref("—");
const searchQuery = ref("");
const showManual = ref(false);

const faqs = ref([
  {
    id: 1,
    open: false,
    question: "How do I get started with Silingan Coffee Management System?",
    answer:
      "Log in using your assigned username and password. Select your branch from the dropdown. Your dashboard will show an overview of daily operations. Navigate using the left sidebar to access Inventory, Sales, Schedule, and other modules.",
  },
  {
    id: 2,
    open: false,
    question: "How do I process a new sale?",
    answer:
      'Go to Sales from the sidebar, then click "Process New Sale". Select the items ordered by the customer, apply any discounts (Senior/PWD), and click Confirm. A receipt will be generated automatically.',
  },
  {
    id: 3,
    open: false,
    question: "How do I manage my inventory and track stock levels?",
    answer:
      "Go to Inventory from the sidebar. You can view current stock levels, add new products, edit existing ones, and set low stock thresholds. Items below the threshold will appear in the Low Stock Alert section on the dashboard.",
  },
  {
    id: 4,
    open: false,
    question: "How do I add and manage employees?",
    answer:
      'Go to Employees from the sidebar (Admin only). Click "Add Employee" and fill in the employee details including name, position, department, branch, and hourly rate. You can also edit or archive existing employees.',
  },
  {
    id: 5,
    open: false,
    question: "How do I generate and view business reports?",
    answer:
      "Go to Reports & Analytics from the sidebar. You can generate daily, weekly, and monthly summaries for sales, inventory, and schedules. Use the date range picker to filter specific periods and export reports as needed.",
  },
  {
    id: 6,
    open: false,
    question: "How do I search for specific information?",
    answer:
      "Use the Search bar at the top of each page to find employees, products, orders, or transactions. You can also use the Search module in the sidebar for a more detailed search across all data.",
  },
  {
    id: 7,
    open: false,
    question: "How do I maintain the system and backup data?",
    answer:
      "Go to Maintenance from the sidebar (Admin only). You can run manual backups, view backup history, monitor system health, and run maintenance tasks like clearing cache and optimizing the database.",
  },
  {
    id: 8,
    open: false,
    question: "Why are all prices shown in Philippine Peso (₱)?",
    answer:
      "Silingan Coffee operates in the Philippines, so all prices, transactions, and reports are displayed in Philippine Peso (₱) by default. This cannot be changed as it is set to match local compliance requirements.",
  },
  {
    id: 9,
    open: false,
    question: "What should I do if I encounter system errors?",
    answer:
      "First, try refreshing the page. If the error persists, check your internet connection. For persistent issues, take a screenshot of the error and contact support via email at support@silingancoffee.ph or call +63 2 8123-4567.",
  },
  {
    id: 10,
    open: false,
    question: "How is my business data protected and backed up?",
    answer:
      "All data is stored securely in Supabase (PostgreSQL), a cloud database with encryption at rest and in transit. Automatic backups are performed daily. Admins can also create manual backups from the Maintenance page. Archived items are never permanently deleted.",
  },
]);

const filteredFaqs = computed(() => {
  if (!searchQuery.value) return faqs.value;
  const q = searchQuery.value.toLowerCase();
  return faqs.value.filter(
    (f) =>
      f.question.toLowerCase().includes(q) ||
      f.answer.toLowerCase().includes(q),
  );
});

const toggleFaq = (faq) => {
  faq.open = !faq.open;
};

const jumpToFaq = (id) => {
  const faq = faqs.value.find((f) => f.id === id);
  if (faq) {
    faq.open = true;
    setTimeout(() => {
      document
        .getElementById(`faq-${id}`)
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }
};

const quickTopics = [
  {
    title: "Dashboard Overview",
    sub: "Understanding your main dashboard",
    icon: LayoutDashboard,
    faqId: 1,
  },
  {
    title: "Processing Sales",
    sub: "Step-by-step sales guide",
    icon: ShoppingCart,
    faqId: 2,
  },
  {
    title: "Inventory Management",
    sub: "Managing stock and products",
    icon: Package,
    faqId: 3,
  },
  {
    title: "Employee Management",
    sub: "Adding and managing staff",
    icon: Users,
    faqId: 4,
  },
];
</script>

<style scoped>
/* (all styles unchanged from original) */
.help-page {
  padding: 24px 32px;
  background: #fafafa;
  min-height: 100vh;
  font-family: "Inter", sans-serif;
}
.hero-section {
  background: #fffbf3;
  border: 1px solid #f0e4c8;
  border-radius: 14px;
  padding: 32px 24px;
  text-align: center;
  margin-bottom: 24px;
}
.hero-icon {
  width: 52px; height: 52px;
  background: #fff8e7; border: 1px solid #f0d080; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #8b4513; margin: 0 auto 14px;
}
.hero-title { font-size: 26px; font-weight: 700; color: #1a1a1a; margin-bottom: 6px; }
.hero-sub { font-size: 14px; color: #8b4513; margin: 0; }
.main-layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; }
.panel { background: #fff; border: 1px solid #e9e4df; border-radius: 12px; padding: 20px; }
.mb-3 { margin-bottom: 16px; }
.mt-4 { margin-top: 24px; }
.panel-title { font-size: 14px; font-weight: 700; color: #1a1a1a; }
.panel-sub { font-size: 12px; color: #6b6b6b; margin-top: 2px; }
.mb-1 { margin-bottom: 4px; }
.panel-header-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px; }
.panel-icon { color: #8b4513; margin-top: 2px; flex-shrink: 0; }
.faq-header { margin-bottom: 16px; }
.search-input {
  width: 100%; padding: 10px 14px; border: 1px solid #e9e4df;
  border-radius: 8px; font-size: 13px; color: #495057; outline: none;
  box-sizing: border-box; transition: border-color 0.15s;
}
.search-input:focus { border-color: #8b4513; box-shadow: 0 0 0 3px rgba(139,69,19,0.08); }
.search-input::placeholder { color: #adb5bd; }
.faq-list { display: flex; flex-direction: column; gap: 8px; }
.faq-item { border: 1px solid #e9e4df; border-radius: 8px; overflow: hidden; cursor: pointer; transition: border-color 0.15s; }
.faq-item:hover { border-color: #c49a6c; }
.faq-item.open { border-color: #8b4513; }
.faq-question { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; font-size: 13px; font-weight: 500; color: #1a1a1a; gap: 12px; }
.faq-chevron { color: #8b4513; flex-shrink: 0; }
.faq-answer { padding: 0 16px 14px; font-size: 13px; color: #495057; line-height: 1.6; border-top: 1px solid #f5f0eb; padding-top: 12px; }
.quick-list { display: flex; flex-direction: column; gap: 10px; }
.quick-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid #f0e8df; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
.quick-item:hover { background: #fff8f4; border-color: #c49a6c; }
.quick-icon-wrap { width: 34px; height: 34px; background: #fff3e6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #8b4513; flex-shrink: 0; }
.quick-title { font-size: 13px; font-weight: 600; color: #1a1a1a; }
.quick-sub { font-size: 11px; color: #8b4513; margin-top: 1px; }
.contact-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.contact-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: #fffbf5; border: 1px solid #f0e8df; border-radius: 8px; }
.contact-icon-wrap { width: 32px; height: 32px; background: #fff3e6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #8b4513; flex-shrink: 0; }
.contact-title { font-size: 13px; font-weight: 600; color: #1a1a1a; }
.contact-detail { font-size: 12px; color: #6b6b6b; margin-top: 1px; }
.status-list { display: flex; flex-direction: column; gap: 12px; }
.status-row { display: flex; justify-content: space-between; align-items: center; }
.status-label { font-size: 13px; color: #495057; }
.status-val { font-size: 13px; color: #6b6b6b; }
.badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.badge-active { background: #d4edda; color: #155724; }
.resources-panel { background: #fff; border: 1px solid #e9e4df; border-radius: 12px; padding: 20px; }
.resources-list { display: flex; flex-direction: column; gap: 8px; }
.resource-item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid #f0e8df; border-radius: 10px; cursor: pointer; transition: all 0.15s; }
.resource-item:hover { background: #fffbf5; border-color: #c49a6c; }
.resource-icon-wrap { width: 38px; height: 38px; background: #fff3e6; border-radius: 9px; display: flex; align-items: center; justify-content: center; color: #8b4513; flex-shrink: 0; }
.resource-text { flex: 1; }
.resource-title { font-size: 13px; font-weight: 600; color: #1a1a1a; margin-bottom: 2px; }
.resource-sub { font-size: 12px; color: #6b6b6b; }
.resource-arrow { color: #c49a6c; font-size: 16px; flex-shrink: 0; }
@media (max-width: 900px) {
  .main-layout { grid-template-columns: 1fr; }
  .help-page { padding: 16px; }
}
</style>
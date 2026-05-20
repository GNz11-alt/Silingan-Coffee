import { createRouter, createWebHistory } from "vue-router";

// Public
import Login from "./views/Login.vue";
import Landing from "./views/Landing.vue";

// Layouts
import AdminLayout from "./layouts/AdminLayout.vue";
import ManagerLayout from "./layouts/ManagerLayout.vue";
import StaffLayout from "./layouts/StaffLayout.vue";

const routes = [
  // Default redirect to admin dashboard
  {
    path: "/dashboard",
    redirect: "/admin/dashboard",
  },

  // Public routes
  {
    path: "/",
    name: "Landing",
    component: Landing,
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
  },

  // Admin routes
  {
    path: "/admin",
    component: AdminLayout,
    children: [
      {
        path: "dashboard",
        name: "AdminDashboard",
        component: () => import("./views/admin/Dashboard.vue"),
      },
      {
        path: "inventory",
        name: "AdminInventory",
        component: () => import("./views/admin/Inventory.vue"),
      },
      {
        path: "employees",
        name: "AdminEmployees",
        component: () => import("./views/admin/Employee.vue"),
      },
      {
        path: "schedule",
        name: "AdminSchedule",
        component: () => import("./views/admin/Schedule.vue"),
      },
      {
        path: "sales",
        name: "AdminSales",
        component: () => import("./views/admin/Sales.vue"),
      },
      {
        path: "menu-pricing",
        name: "AdminMenuPricing",
        component: () => import("./views/admin/MenuPricing.vue"),
      },
      {
        path: "reports",
        name: "AdminReports",
        component: () => import("./views/admin/Reports.vue"),
      },
      {
        path: "backup",
        name: "AdminBackup",
        component: () => import("./views/admin/Backup.vue"),
      },
      {
        path: "search",
        name: "AdminSearch",
        component: () => import("./views/admin/Search.vue"),
      },
      {
        path: "maintenance",
        name: "AdminMaintenance",
        component: () => import("./views/admin/Maintenance.vue"),
      },
      {
        path: "help",
        name: "AdminHelp",
        component: () => import("./views/admin/Help.vue"),
      },
      {
        path: "about",
        name: "AdminAbout",
        component: () => import("./views/admin/About.vue"),
      },
    ],
  },

  // Manager routes
  {
    path: "/manager",
    component: ManagerLayout,
    children: [
      {
        path: "dashboard",
        name: "ManagerDashboard",
        component: () => import("./views/manager/Dashboard.vue"),
      },
      {
        path: "inventory",
        name: "ManagerInventory",
        component: () => import("./views/manager/Inventory.vue"),
      },
      {
        path: "sales",
        name: "ManagerSales",
        component: () => import("./views/manager/Sales.vue"),
      },
      {
        path: "schedule",
        name: "ManagerSchedule",
        component: () => import("./views/manager/Schedule.vue"),
      },
      {
        path: "menu-pricing",
        name: "ManagerMenuPricing",
        component: () => import("./views/manager/MenuPricing.vue"),
      },
      {
        path: "reports",
        name: "ManagerReports",
        component: () => import("./views/manager/Reports.vue"),
      },
      {
        path: "backup",
        name: "ManagerBackup",
        component: () => import("./views/manager/Backup.vue"),
      },
      {
        path: "search",
        name: "ManagerSearch",
        component: () => import("./views/manager/Search.vue"),
      },
      {
        path: "help",
        name: "ManagerHelp",
        component: () => import("./views/manager/Help.vue"),
      },
      {
        path: "about",
        name: "ManagerAbout",
        component: () => import("./views/manager/About.vue"),
      },
    ],
  },

  // Staff routes
  {
    path: "/staff",
    component: StaffLayout,
    children: [
      {
        path: "dashboard",
        name: "StaffDashboard",
        component: () => import("./views/staff/Dashboard.vue"),
      },
      {
        path: "pos",
        name: "StaffPOS",
        component: () => import("./views/staff/POS.vue"),
      },
      {
        path: "inventory",
        name: "StaffInventory",
        component: () => import("./views/staff/Inventory.vue"),
      },
      {
        path: "schedule",
        name: "StaffSchedule",
        component: () => import("./views/staff/Schedule.vue"),
      },
      {
        path: "menu",
        name: "StaffMenu",
        component: () => import("./views/staff/Menu.vue"),
      },
      {
        path: "backup",
        name: "StaffBackup",
        component: () => import("./views/staff/Backup.vue"),
      },
      {
        path: "help",
        name: "StaffHelp",
        component: () => import("./views/staff/Help.vue"),
      },
      {
        path: "search",
        name: "StaffSearch",
        component: () => import("./views/staff/Search.vue"),
      },
      {
        path: "about",
        name: "StaffAbout",
        component: () => import("./views/staff/About.vue"),
      },
    ],
  },

  // Catch-all redirect to admin dashboard
  {
    path: "/:pathMatch(.*)*",
    redirect: "/admin/dashboard",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Route guards
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const role = localStorage.getItem("role");

  // If not logged in and trying to access protected page
  if (!isLoggedIn && to.path !== "/login" && to.path !== "/") {
    next("/login");
    return;
  }

  // Prevent wrong role from accessing other role's pages
  if (isLoggedIn) {
    if (to.path.startsWith("/admin") && role !== "admin") {
      next("/login");
      return;
    }
    if (to.path.startsWith("/manager") && role !== "manager") {
      next("/login");
      return;
    }
    if (to.path.startsWith("/staff") && role !== "staff") {
      next("/login");
      return;
    }
  }

  next();
});

export default router;

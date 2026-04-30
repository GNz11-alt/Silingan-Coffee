import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from './layouts/MainLayout.vue'
import Login from './views/Login.vue'
import Landing from './views/Landing.vue'
import Dashboard from './views/Dashboard.vue'
import Inventory from './views/Inventory.vue' 

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/',
    name: 'Landing',
    component: Landing
  },
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: Inventory
      },
      {
        path: 'search',
        name: 'Search',
        component: () => import('./views/Search.vue')
      },
      {
        path: 'about',
        name: 'About',
        component: () => import('./views/About.vue')
      },
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
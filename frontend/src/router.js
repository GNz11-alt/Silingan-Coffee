import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from './layouts/MainLayout.vue'
import Login from './views/Login.vue'
import Landing from './views/Landing.vue'
import Dashboard from './views/Dashboard.vue'
import Inventory from './views/Inventory.vue'
import Employee from './views/Employee.vue'
import Schedule from './views/Schedule.vue' 

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
      path: '/dashboard',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: Dashboard
        },
        {
          path: 'employee',
          name: 'Employee',
          component: Employee
        },
        {
          path: 'schedule',
          name: 'Schedule',
          component: Schedule
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
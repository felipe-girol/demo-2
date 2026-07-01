import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView },
  {
    path: '/agency',
    name: 'agency',
    component: () => import('../views/AgencyView.vue'),
  },
  {
    path: '/agency/rockets',
    name: 'rockets',
    component: () => import('../views/RocketsView.vue'),
  },
  {
    path: '/agency/launches',
    name: 'launches',
    component: () => import('../views/LaunchesView.vue'),
  },
  {
    path: '/customer',
    name: 'customer',
    component: () => import('../views/CustomerView.vue'),
  },
  {
    path: '/customer/launches',
    name: 'customer-launches',
    component: () => import('../views/LaunchCatalogView.vue'),
  },
  {
    path: '/customer/launches/:id',
    name: 'customer-launch-detail',
    component: () => import('../views/LaunchDetailView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

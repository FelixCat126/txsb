import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue')
  },
  {
    path: '/detection',
    name: 'ObjectDetection',
    component: () => import('../components/ObjectDetection.vue')
  }
]

const router = new VueRouter({
  routes
})

export default router 
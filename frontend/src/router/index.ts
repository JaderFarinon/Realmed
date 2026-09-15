import { createRouter, createWebHistory } from 'vue-router'
import { useAuthUser } from '@/composables/useAuthUser'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    {
      path: '/login',
      component: () => import('@/views/Auth/Signin.vue'),
      meta: { public: true, title: 'Login' },
    },
    {
      path: '/dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: { title: 'Dashboard' },
    },
    {
      path: '/usuarios',
      component: () => import('@/views/Configuracoes/UsuariosView.vue'),
      meta: { title: 'Usuários', admin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/views/NotFound.vue'),
      meta: { public: true, title: 'Página não encontrada' },
    },
  ],
})
router.beforeEach(async (to) => {
  document.title = `${String(to.meta.title || 'Central de Guias')} | Central de Guias`
  const token = localStorage.getItem('token')
  if (to.meta.public) return to.path === '/login' && token ? '/dashboard' : true
  if (!token) return { path: '/login', query: { redirect: to.fullPath } }
  try {
    const user = await useAuthUser().loadUser()
    if (to.meta.admin && !['masteradmin', 'admin'].includes(user?.role || '')) return '/dashboard'
    return true
  } catch {
    localStorage.removeItem('token')
    return '/login'
  }
})
export default router

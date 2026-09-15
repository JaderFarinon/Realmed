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
    { path: '/central-de-guias', component: () => import('@/views/Guides/GuideList.vue'), meta: { title: 'Central de Guias' } },
    { path: '/central-de-guias/:id', component: () => import('@/views/Guides/GuideDetail.vue'), meta: { title: 'Processo' } },
    { path: '/pacientes', component: () => import('@/views/Patients/PatientsView.vue'), meta: { title: 'Pacientes' } },
    { path: '/pacientes/:id', component: () => import('@/views/Patients/PatientDetail.vue'), meta: { title: 'Paciente' } },
    { path: '/cadastros/convenios', component: () => import('@/views/Cadastros/CatalogView.vue'), meta: { title: 'Convênios', catalog: 'insurance' } },
    { path: '/cadastros/profissionais', component: () => import('@/views/Cadastros/CatalogView.vue'), meta: { title: 'Profissionais', catalog: 'professionals' } },
    { path: '/cadastros/modelos-documentos', component: () => import('@/views/Cadastros/DocumentTemplatesView.vue'), meta: { title: 'Modelos de Documentos' } },
    { path: '/cadastros/procedimentos', component: () => import('@/views/Cadastros/CatalogView.vue'), meta: { title: 'Procedimentos', catalog: 'procedures' } },
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

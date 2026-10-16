import { createRouter, createWebHistory } from 'vue-router'
import { useAuthUser } from '@/composables/useAuthUser'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/dashboard' },
    {
      path: '/sem-permissao',
      component: () => import('@/views/PermissionDenied.vue'),
      meta: { title: 'Sem permissão' },
    },
    {
      path: '/configuracoes/permissoes',
      component: () => import('@/views/Configuracoes/PermissionsView.vue'),
      meta: { title: 'Permissões', admin: true },
    },
    { path: '/estoque', redirect: '/estoque/resumo' },
    {
      path: '/estoque/resumo',
      component: () => import('@/views/Inventory/InventoryDashboard.vue'),
      meta: { title: 'Resumo de estoque', module: 'inventory_dashboard' },
    },
    ...[
      ['saldos', 'Saldos e ajustes', 'inventory_stock'],
      ['produtos', 'Produtos', 'inventory_products'],
      ['fornecedores', 'Fornecedores', 'inventory_suppliers'],
      ['setores', 'Setores', 'inventory_sectors'],
      ['categorias', 'Categorias', 'inventory_categories'],
      ['apresentacoes', 'Apresentações', 'inventory_presentations'],
      ['notas-fiscais', 'Notas fiscais', 'inventory_invoices'],
      ['pedidos', 'Pedidos', 'inventory_requests'],
      ['relatorios', 'Relatórios de estoque', 'inventory_reports'],
    ].map(([slug, title, module]) => ({
      path: `/estoque/${slug}`,
      component: () => import('@/views/Inventory/InventoryView.vue'),
      meta: { title, module, inventory: slug },
    })),
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
      path: '/integracoes/stenci',
      component: () => import('@/views/Integrations/StenciView.vue'),
      meta: { title: 'Integração Stenci', admin: true },
    },
    { path: '/central-de-guias', redirect: '/central-de-guias/tratamentos' },
    {
      path: '/central-de-guias/novo',
      component: () => import('@/views/Guides/NewTreatment.vue'),
      meta: { title: 'Novo Tratamento' },
    },
    {
      path: '/central-de-guias/tratamentos',
      component: () => import('@/views/Guides/GuideList.vue'),
      meta: { title: 'Gestão de Tratamentos' },
    },
    {
      path: '/central-de-guias/tratamentos/:id',
      component: () => import('@/views/Guides/GuideDetail.vue'),
      meta: { title: 'Tratamento' },
    },
    {
      path: '/central-de-guias/:id(\\d+)',
      redirect: (to) => `/central-de-guias/tratamentos/${to.params.id}`,
    },
    {
      path: '/pacientes',
      component: () => import('@/views/Patients/PatientsView.vue'),
      meta: { title: 'Pacientes' },
    },
    {
      path: '/pacientes/:id',
      component: () => import('@/views/Patients/PatientDetail.vue'),
      meta: { title: 'Paciente' },
    },
    {
      path: '/cadastros/convenios',
      component: () => import('@/views/Cadastros/CatalogView.vue'),
      meta: { title: 'Convênios', catalog: 'insurance' },
    },
    {
      path: '/cadastros/profissionais',
      component: () => import('@/views/Cadastros/CatalogView.vue'),
      meta: { title: 'Profissionais', catalog: 'professionals' },
    },
    {
      path: '/cadastros/modelos-documentos',
      component: () => import('@/views/Cadastros/DocumentTemplatesView.vue'),
      meta: { title: 'Modelos de Documentos' },
    },
    {
      path: '/cadastros/procedimentos',
      component: () => import('@/views/Cadastros/CatalogView.vue'),
      meta: { title: 'Procedimentos', catalog: 'procedures' },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/views/NotFound.vue'),
      meta: { public: true, title: 'Página não encontrada' },
    },
  ],
})
router.beforeEach(async (to) => {
  document.title = `${String(to.meta.title || 'Realmed')} | Realmed`
  const token = localStorage.getItem('token')
  if (to.meta.public) return to.path === '/login' && token ? '/dashboard' : true
  if (!token) return { path: '/login', query: { redirect: to.fullPath } }
  try {
    const user = await useAuthUser().loadUser()
    if (!user) return '/login'
    if (to.meta.admin && !['masteradmin', 'admin'].includes(user.role)) return '/sem-permissao'
    const module = String(
      to.meta.module ||
        (
          {
            '/dashboard': 'guide_processes',
            '/central-de-guias/novo': 'guide_processes',
            '/central-de-guias/tratamentos': 'guide_processes',
            '/pacientes': 'patients',
            '/cadastros/convenios': 'insurance_providers',
            '/cadastros/profissionais': 'professionals',
            '/cadastros/procedimentos': 'procedures',
            '/cadastros/modelos-documentos': 'document_templates',
          } as Record<string, string>
        )[to.path] ||
        (to.path.startsWith('/central-de-guias/tratamentos/')
          ? 'guide_processes'
          : to.path.startsWith('/pacientes/')
            ? 'patients'
            : ''),
    )
    if (
      module &&
      !useAuthUser().canOperational(
        module,
        to.path === '/central-de-guias/novo' ? 'canCreate' : 'canView',
      )
    )
      return '/sem-permissao'
    return true
  } catch {
    localStorage.removeItem('token')
    return '/login'
  }
})
export default router

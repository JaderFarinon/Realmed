import { createRouter, createWebHistory } from 'vue-router'

import { useAuthUser } from '@/composables/useAuthUser'
import { showPermissionDeniedModal } from '@/composables/usePermissionDeniedModal'
import { sidebarMenuGroups, type SidebarMenuItem } from '@/constants/sidebarMenu'
import { hiddenPermissionModules } from '@/constants/hiddenPermissionModules'
import {
  buildPermissionModuleGroups,
  flattenPermissionModules,
  keyFromPath,
} from '@/utils/permission-modules'
import MarketingCampanhasView from '@/views/MarketingCampanhasView.vue'

const ContratosView = () => import('../views/ContratosView.vue')
const ContratosCadastrosView = () => import('../views/ContratosCadastrosView.vue')

const CADASTRO_ALLOWED_ROLES: string[] = ['masteradmin', 'admin', 'cac_coord']
const SECRETARIA_ALLOWED_PATHS = new Set<string>([
  '/',
  '/dashboard',
  '/esteira-cirurgica/dashboard',
  '/esteira-cirurgica/gestao-cirurgias',
  '/esteira-cirurgica/kanban-multi-presenca',
  '/profile',
  '/suporte',
])
const DEFAULT_DENIED_REDIRECT = '/dashboard'

const permissionModuleGroups = buildPermissionModuleGroups(sidebarMenuGroups, hiddenPermissionModules)
const permissionModules = flattenPermissionModules(permissionModuleGroups)
const GUARDED_PERMISSION_KEYS = new Set<string>()

permissionModules.forEach((module) => {
  if (module?.key) {
    GUARDED_PERMISSION_KEYS.add(module.key.toLowerCase())
  }
})

const BYPASS_PERMISSION_ROLES = new Set<string>(['masteradmin', 'admin'])

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
    { path: '/', redirect: '/dashboard' },
    {
      path: '/contratos',
      name: 'Contratos',
      component: ContratosView,
      meta: { title: 'Gestão de Contratos' },
    },
    {
      path: '/contratos/aditivos',
      redirect: { path: '/contratos', query: { tab: 'aditivos' } },
    },
    {
      path: '/contratos/negociacoes',
      redirect: { path: '/contratos', query: { tab: 'negociacoes' } },
    },
    {
      path: '/contratos/cadastros',
      name: 'Cadastros de Contratos',
      component: ContratosCadastrosView,
      meta: { title: 'Gestão de Contratos - Cadastros' },
    },
    {
      path: '/contratos/templates',
      redirect: { path: '/contratos/cadastros', query: { tab: 'templates' } },
    },
    {
      path: '/contratos/alertas',
      redirect: { path: '/contratos/cadastros', query: { tab: 'alertas' } },
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { title: 'Dashboard' },
    },
    {
      path: '/esteira-cirurgica/autorizacao-convenio',
      name: 'Autorização Convênio',
      component: () => import('../views/EsteiraCirurgica/AutorizacaoConvenio.vue'),
      meta: { title: 'Autorização Convênio' },
    },
    {
      path: '/esteira-cirurgica/dashboard',
      name: 'Esteira Dashboard',
      component: () => import('../views/EsteiraCirurgica/Dashboard.vue'),
      meta: { title: 'Dashboard' },
    },
    {
      path: '/esteira-cirurgica/cadastros',
      name: 'Cadastros da Esteira Cirúrgica',
      component: () => import('../views/EsteiraCirurgica/Cadastros.vue'),
      meta: { title: 'Cadastros da Esteira Cirúrgica', allowedRoles: CADASTRO_ALLOWED_ROLES },
    },
    {
      path: '/esteira-cirurgica/fila-notificacoes',
      name: 'Fila de Notificações',
      component: () => import('../views/EsteiraCirurgica/FilaNotificacoes.vue'),
      meta: { title: 'Fila de Notificações' },
    },
    {
      path: '/esteira-cirurgica/gestao-cirurgias',
      name: 'Gestão de Cirurgias',
      component: () => import('../views/EsteiraCirurgica/GestaoCirurgias.vue'),
      meta: { title: 'Gestão de Cirurgias' },
    },
    {
      path: '/esteira-cirurgica/solicitacoes-cirurgia',
      name: 'Solicitações de Cirurgia',
      component: () => import('../views/EsteiraCirurgica/SolicitacoesCirurgia.vue'),
      meta: { title: 'Solicitações de Cirurgia' },
    },
    {
      path: '/esteira-cirurgica/kanban-multi-presenca',
      name: 'Kanban Multi-presença',
      component: () => import('../views/EsteiraCirurgica/KanbanMultiPresenca.vue'),
      meta: { title: 'Kanban Multi-presença' },
    },
    {
      path: '/esteira-cirurgica/leitos',
      name: 'Leitos (Scheduler)',
      component: () => import('../views/EsteiraCirurgica/Leitos.vue'),
      meta: { title: 'Leitos (Scheduler)' },
    },
    {
      path: '/esteira-cirurgica/radar-evolucoes',
      name: 'Radar de Evoluções',
      component: () => import('../views/EsteiraCirurgica/RadarEvolucoes.vue'),
      meta: { title: 'Radar de Evoluções' },
    },
    {
      path: '/faturamento',
      name: 'Faturamento',
      component: () => import('../views/Faturamento.vue'),
      meta: { title: 'Faturamento' },
    },
    {
      path: '/diretoria',
      name: 'Diretoria',
      component: () => import('../views/PlaceholderPage.vue'),
      meta: { title: 'Diretoria' },
    },
    {
      path: '/financeiro',
      name: 'Financeiro',
      component: () => import('../views/Financeiro.vue'),
      meta: { title: 'Financeiro' },
    },
    {
      path: '/ia/cadastros',
      name: 'IA Cadastros',
      component: () => import('../views/ia/IaCadastrosView.vue'),
      meta: { title: 'Inteligência Artificial - Cadastros' },
    },
    {
      path: '/ia/chat',
      name: 'IA Chat',
      component: () => import('../views/ia/IaChatView.vue'),
      meta: { title: 'Inteligência Artificial - Chat' },
    },
    {
      path: '/marketing/campanhas',
      name: 'marketing-campanhas',
      component: MarketingCampanhasView,
      meta: { requiresAuth: true },
    },
    {
      path: '/gestao-pessoas/sorteios',
      name: 'Gestão de Pessoas - Sorteios',
      component: () => import('../views/GestaoPessoas/SorteiosView.vue'),
      meta: { title: 'Sorteios' },
    },
    {
      path: '/qualidade/gestao-notificacoes',
      name: 'Gestão de Notificações',
      component: () => import('../views/Qualidade/NotIncidentes/GestaoNotificacoes.vue'),
      meta: { title: 'Gestão de Notificações' },
    },
    {
      path: '/configuracoes/mensageria',
      name: 'Mensageria',
      component: () => import('../views/Configuracoes/Mensageria.vue'),
      meta: { title: 'Mensageria' },
    },
    {
      path: '/configuracoes/parametros-sistema',
      name: 'Parâmetros do Sistema',
      component: () => import('../views/Configuracoes/ParametrosSistema.vue'),
      meta: { title: 'Parâmetros do Sistema' },
    },
    {
      path: '/configuracoes/parametrizacoes/tipos-procedimento',
      name: 'Tipos de Procedimento',
      component: () => import('../views/Configuracoes/Parametrizacoes/TiposProcedimento.vue'),
      meta: { title: 'Tipos de Procedimento' },
    },
    {
      path: '/configuracoes/parametrizacoes/etapas-cirurgicas',
      name: 'Etapas',
      component: () => import('../views/Configuracoes/Parametrizacoes/EtapasCirurgicas.vue'),
      meta: { title: 'Etapas' },
    },
    {
      path: '/configuracoes/parametrizacoes/motivos-pendencia',
      name: 'Motivos de Pendência',
      component: () => import('../views/Configuracoes/Parametrizacoes/MotivosPendencia.vue'),
      meta: { title: 'Motivos de Pendência' },
    },
    {
      path: '/configuracoes/parametrizacoes/opme',
      name: 'OPME',
      component: () => import('../views/Configuracoes/Parametrizacoes/Opme.vue'),
      meta: { title: 'OPME', allowedRoles: CADASTRO_ALLOWED_ROLES },
    },
    {

      path: '/configuracoes/parametrizacoes/procedimentos',
      name: 'Procedimentos',
      component: () => import('../views/Configuracoes/Parametrizacoes/Procedimentos.vue'),
      meta: { title: 'Procedimentos', allowedRoles: CADASTRO_ALLOWED_ROLES },
    },
    {
      path: '/configuracoes/parametrizacoes/pacientes',
      name: 'Pacientes',
      component: () => import('../views/Configuracoes/Parametrizacoes/Pacientes.vue'),
      meta: { title: 'Pacientes', allowedRoles: CADASTRO_ALLOWED_ROLES },

    },
    {
      path: '/configuracoes/parametrizacoes/medicos',
      name: 'Médicos',
      component: () => import('../views/Configuracoes/Parametrizacoes/Medicos.vue'),
      meta: { title: 'Médicos', allowedRoles: CADASTRO_ALLOWED_ROLES },
    },
    {
      path: '/configuracoes/parametrizacoes/convenios',
      name: 'Convênios',
      component: () => import('../views/Configuracoes/Parametrizacoes/Convenios.vue'),
      meta: { title: 'Convênios', allowedRoles: CADASTRO_ALLOWED_ROLES },
    },
    {
      path: '/configuracoes/parametrizacoes/regras-por-convenio',
      name: 'Regras por Convênio',
      component: () => import('../views/Configuracoes/Parametrizacoes/RegrasPorConvenio.vue'),
      meta: { title: 'Regras por Convênio' },
    },
    {
      path: '/configuracoes/parametrizacoes/categorias-esteira',
      name: 'Categorias da Esteira',
      component: () => import('../views/Configuracoes/Parametrizacoes/CategoriasEsteira.vue'),
      meta: { title: 'Categorias da Esteira' },
    },
    {
      path: '/configuracoes/permissoes',
      name: 'Permissões',
      component: () => import('../views/Configuracoes/PermissoesView.vue'),
      meta: { title: 'Permissões' },
    },

    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Auth/Signin.vue'),
      meta: {
        title: 'Login',
        public: true,
      },

    },
    {
      path: '/notificacoes-incidentes/nova',
      name: 'Notificação de Incidente',
      component: () => import('../views/Qualidade/NotIncidentes/NovaNotificacaoPublica.vue'),
      meta: { title: 'Nova Notificação de Incidente', public: true },
    },
    {
      path: '/configuracoes/unidades',
      name: 'Unidades',
      component: () => import('../views/Configuracoes/Unidades.vue'),
      meta: { title: 'Unidades' },
    },
    {
      path: '/profile',
      name: 'Perfil',
      component: () => import('../views/Others/UserProfile.vue'),
      meta: { title: 'Perfil' },
    },
    {
      path: '/suporte',
      name: 'Suporte',
      component: () => import('../views/Suporte/SupportRequestsView.vue'),
      meta: { title: 'Suporte' },
    },
    {
      path: '/administracao/suporte',
      name: 'Suporte Administração',
      component: () => import('../views/Suporte/SupportRequestsView.vue'),
      meta: { title: 'Suporte', allowedRoles: ['admin', 'masteradmin'], adminView: true },
    },
    {
      path: '/relatorios/centro-cirurgico/mapa-cirurgico',
      name: 'Mapa Cirúrgico',
      component: () => import('../views/Relatorios/CentroCirurgico/MapaCirurgico.vue'),
      meta: { title: 'Mapa Cirúrgico' },
    },
    {
      path: '/relatorios/repasse-medico/valores-a-pagar',
      name: 'Repasse Médico - Valores a Pagar',
      component: () => import('../views/Relatorios/RepasseMedico/ValoresAPagar.vue'),
      meta: { title: 'Repasse Médico - Valores a Pagar' },
    },

    {
      path: '/configuracoes/usuarios',
      name: 'Usuários',
      component: () => import('../views/Configuracoes/UsuariosView.vue'),
      meta: { title: 'Usuários' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: '404 Error',
      component: () => import('../views/Errors/FourZeroFour.vue'),
      meta: { title: '404 Error' },
    },
  ],
})

export default router

const authStore = useAuthUser()

const resolveFirstAccessiblePath = (): string => {
  const normalizedRole = (authStore.role.value ?? '').toLowerCase()

  if (normalizedRole === 'secretaria') {
    for (const path of SECRETARIA_ALLOWED_PATHS) {
      if (path !== '/') {
        return path
      }
    }
    return DEFAULT_DENIED_REDIRECT
  }

  if (BYPASS_PERMISSION_ROLES.has(normalizedRole)) {
    return DEFAULT_DENIED_REDIRECT
  }

  const visitItems = (items: SidebarMenuItem[]): string | null => {
    for (const item of items) {
      if (item.path) {
        const moduleKey = keyFromPath(item.path)
        const normalizedKey = moduleKey.toLowerCase()

        if (
          !GUARDED_PERMISSION_KEYS.has(normalizedKey) ||
          authStore.hasModulePermission(normalizedKey, 'view')
        ) {
          return item.path
        }
      }

      if (Array.isArray(item.subItems) && item.subItems.length > 0) {
        const nested = visitItems(item.subItems)
        if (nested) {
          return nested
        }
      }
    }

    return null
  }

  for (const group of sidebarMenuGroups) {
    const path = visitItems(group.items)
    if (path) {
      return path
    }
  }

  return '/profile'
}

router.beforeEach(async (to, from, next) => {
  const title = typeof to.meta?.title === 'string' && to.meta.title.length
    ? `${to.meta.title} | Artro`
    : 'Artro'
  document.title = title

  const token = localStorage.getItem('token')
  const isPublicRoute = to.meta?.public === true

  if (!token && !isPublicRoute) {
    next('/login')
    return
  }

  if (token && to.path === '/login') {
    next('/')
    return
  }

  if (!token) {
    next()
    return
  }

  try {
    if (!authStore.isLoaded.value || authStore.isLoading.value) {
      await authStore.loadUser()
    }
  } catch (error) {
    console.error('Falha ao carregar dados do usuário autenticado', error)
    localStorage.removeItem('token')
    next('/login')
    return
  }

  const normalizedRole = (authStore.role.value ?? '').toLowerCase()
  const allowedRolesMeta = Array.isArray(to.meta?.allowedRoles)
    ? to.meta.allowedRoles.map((role: string) => role.toLowerCase())
    : []

  if (allowedRolesMeta.length > 0) {
    if (!normalizedRole || !allowedRolesMeta.includes(normalizedRole)) {
      showPermissionDeniedModal()
      next(DEFAULT_DENIED_REDIRECT)
      return
    }
  }

  const moduleKey = keyFromPath(to.path)
  const normalizedModuleKey = moduleKey.toLowerCase()
  const requiresPermission =
    !isPublicRoute &&
    GUARDED_PERMISSION_KEYS.has(normalizedModuleKey) &&
    !BYPASS_PERMISSION_ROLES.has(normalizedRole)
  const possuiPermissao = requiresPermission
    ? authStore.hasModulePermission(normalizedModuleKey, 'view')
    : true

  if (!isPublicRoute && normalizedRole === 'secretaria') {
    const hasBaseAccess = SECRETARIA_ALLOWED_PATHS.has(to.path)

    if (!hasBaseAccess && !possuiPermissao) {
      showPermissionDeniedModal()
      next(DEFAULT_DENIED_REDIRECT)
      return
    }
  }

  if (requiresPermission && !possuiPermissao) {
    showPermissionDeniedModal()
    const fallbackPath = resolveFirstAccessiblePath()
    next(fallbackPath)
    return
  }

  next()
})

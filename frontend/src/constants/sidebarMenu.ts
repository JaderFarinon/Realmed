import type { Component } from 'vue'

import {
  AiIcon,
  ArchiveIcon,
  BarChartIcon,
  BoxCubeIcon,
  BullhornIcon,
  ChatIcon,
  SuccessIcon,
  ChevronDownIcon,
  DocsIcon,
  FlagIcon,
  HorizontalDots,
  LayoutDashboardIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  SettingsIcon,
  TableIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@/icons'

export interface SidebarMenuItem {
  key?: string
  icon?: Component
  name: string
  path?: string
  subItems?: SidebarMenuItem[]
}

export interface SidebarMenuGroup {
  title: string
  items: SidebarMenuItem[]
}

const sortMenuItems = (
  items: SidebarMenuItem[],
  keepDashboardFirst = false,
): SidebarMenuItem[] => {
  const sortedItems = items
    .map((item) => ({
      ...item,
      ...(item.subItems ? { subItems: sortMenuItems(item.subItems) } : {}),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))

  if (!keepDashboardFirst) {
    return sortedItems
  }

  const dashboardIndex = sortedItems.findIndex(
    (item) => item.name.toLowerCase() === 'dashboard',
  )

  if (dashboardIndex > 0) {
    const [dashboardItem] = sortedItems.splice(dashboardIndex, 1)
    sortedItems.unshift(dashboardItem)
  }

  return sortedItems
}

export const sidebarMenuGroups: SidebarMenuGroup[] = [
  {
    title: 'Geral',
    items: sortMenuItems(
      [
        {
          icon: LayoutDashboardIcon,
          name: 'Dashboard',
          path: '/dashboard',
        },
      {
        icon: ArchiveIcon,
        name: 'Cadastros',
        subItems: [
          { name: '+ OPME', path: '/configuracoes/parametrizacoes/opme' },
          { name: '+ Procedimentos', path: '/configuracoes/parametrizacoes/procedimentos' },
          { name: '+ Convênios', path: '/configuracoes/parametrizacoes/convenios' },
          { name: '+ Médicos', path: '/configuracoes/parametrizacoes/medicos' },
          { name: '+ Pacientes', path: '/configuracoes/parametrizacoes/pacientes' },
        ],
      },
      {
        icon: BoxCubeIcon,
        name: 'CAC',
        subItems: [
          {
            icon: BoxCubeIcon,
            name: 'Esteira Cirúrgica',
            subItems: [
              { name: '+ Cadastros', path: '/esteira-cirurgica/cadastros' },
              { name: '+ Autorização Convênio', path: '/esteira-cirurgica/autorizacao-convenio' },
              { name: '+ Dashboard', path: '/esteira-cirurgica/dashboard' },
              { name: '+ Fila de Notificações', path: '/esteira-cirurgica/fila-notificacoes' },
              { name: '+ Gestão de Cirurgias', path: '/esteira-cirurgica/gestao-cirurgias' },
              { name: '+ Kanban Multi-presença', path: '/esteira-cirurgica/kanban-multi-presenca' },
              { name: '+ Leitos (Scheduler)', path: '/esteira-cirurgica/leitos' },
              { name: '+ Radar de Evoluções', path: '/esteira-cirurgica/radar-evolucoes' },
            ],
          },
        ],
      },
      {
        icon: UserGroupIcon,
        name: 'Diretoria',
        subItems: [
          { name: '+ Dashboard', path: '/diretoria' },
          {
            icon: DocsIcon,
            name: 'Contratos',
            subItems: [
              { name: '+ Contratos', path: '/contratos' },
              { name: '+ Cadastros', path: '/contratos/cadastros' },
            ],
          },
        ],
      },
      {
        icon: DocsIcon,
        name: 'Relatórios',
        subItems: [
          {
            name: 'Centro Cirúrgico',
            subItems: [{ name: '+ Mapa Cirúrgico', path: '/relatorios/centro-cirurgico/mapa-cirurgico' }],
          },
          {
            name: 'Repasse Médico',
            subItems: [{ name: '+ Valores a Pagar', path: '/relatorios/repasse-medico/valores-a-pagar' }],
          },
        ],
      },
      {
        icon: PieChartIcon,
        name: 'Faturamento',
        path: '/faturamento',
      },
      {
        icon: BarChartIcon,
        name: 'Financeiro',
        path: '/financeiro',
      },
      {
        icon: AiIcon,
        name: 'Inteligência Artificial',
        subItems: [
          { name: '+ Cadastros', path: '/ia/cadastros' },
          { name: '+ Chat', path: '/ia/chat' },
        ],
      },
      {
        icon: SuccessIcon,
        name: 'Qualidade',
        subItems: [
          {
            icon: FlagIcon,
            name: 'Gestão de Notificações',
            path: '/qualidade/gestao-notificacoes',
          },
        ],
      },
      {
        icon: BullhornIcon,
        name: 'Marketing',
        subItems: [
          { name: '+ Campanhas', path: '/marketing/campanhas' },
        ],
      },
        {
          icon: UserGroupIcon,
          name: 'Gestão de Pessoas',
          subItems: [
            { name: '+ Sorteio', path: '/gestao-pessoas/sorteios' },
          ],
        },
      ],
      true,
    ),
  },
  {
    title: 'Administração',
    items: sortMenuItems([
      {
        icon: SettingsIcon,
        name: 'Configurações',
        subItems: [
          {
            icon: ChatIcon,
            name: '+ Mensageria',
            path: '/configuracoes/mensageria',
          },
          {
            icon: PageIcon,
            name: '+ Parâmetros do Sistema',
            path: '/configuracoes/parametros-sistema',
          },
          {
            icon: PlugInIcon,
            name: '+ Permissões',
            path: '/configuracoes/permissoes',
          },
          {
            icon: TableIcon,
            name: '+ Unidades',
            path: '/configuracoes/unidades',
          },
          {
            icon: UserCircleIcon,
            name: '+ Usuários',
            path: '/configuracoes/usuarios',
          },
        ],
      },
    ]),
  },
]

export { ChevronDownIcon, HorizontalDots }

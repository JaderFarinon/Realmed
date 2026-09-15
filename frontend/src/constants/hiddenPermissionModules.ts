import { keyFromPath, type PermissionModule } from '@/utils/permission-modules'

export const hiddenPermissionModules: PermissionModule[] = [
  {
    key: keyFromPath('/profile'),
    label: 'Perfil',
    path: '/profile',
  },
  {
    key: keyFromPath('/suporte'),
    label: 'Suporte',
    path: '/suporte',
  },
  {
    key: keyFromPath('/administracao/suporte'),
    label: 'Suporte (Administração)',
    path: '/administracao/suporte',
  },
  {
    key: keyFromPath('/esteira-cirurgica/solicitacoes-cirurgia'),
    label: 'Esteira Cirúrgica / Solicitações de Cirurgia',
    path: '/esteira-cirurgica/solicitacoes-cirurgia',
  },
  {
    key: keyFromPath('/configuracoes/parametrizacoes/tipos-procedimento'),
    label: 'Configurações / Parametrizações / Tipos de Procedimento',
    path: '/configuracoes/parametrizacoes/tipos-procedimento',
  },
  {
    key: keyFromPath('/configuracoes/parametrizacoes/etapas-cirurgicas'),
    label: 'Configurações / Parametrizações / Etapas Cirúrgicas',
    path: '/configuracoes/parametrizacoes/etapas-cirurgicas',
  },
  {
    key: keyFromPath('/configuracoes/parametrizacoes/motivos-pendencia'),
    label: 'Configurações / Parametrizações / Motivos de Pendência',
    path: '/configuracoes/parametrizacoes/motivos-pendencia',
  },
  {
    key: keyFromPath('/configuracoes/parametrizacoes/regras-por-convenio'),
    label: 'Configurações / Parametrizações / Regras por Convênio',
    path: '/configuracoes/parametrizacoes/regras-por-convenio',
  },
  {
    key: keyFromPath('/configuracoes/parametrizacoes/categorias-esteira'),
    label: 'Configurações / Parametrizações / Categorias da Esteira',
    path: '/configuracoes/parametrizacoes/categorias-esteira',
  },
]

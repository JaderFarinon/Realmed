import type { AuthUser } from '@/composables/useAuthUser'
export function userHome(user: AuthUser | null): string {
  if (!user) return '/login'
  if (user.permissionsEnabled === false || ['admin', 'masteradmin'].includes(user.role)) return '/central-de-guias/dashboard'
  const destinations = [
    ['guide_processes', '/central-de-guias/dashboard'],
    ['inventory_dashboard', '/estoque/resumo'],
    ['inventory_stock', '/estoque/saldos'],
    ['inventory_products', '/estoque/produtos'],
    ['inventory_consumptions', '/estoque/requisicoes'],
    ['inventory_purchase_orders', '/estoque/pedidos'],
    ['inventory_invoices', '/estoque/notas-fiscais'],
    ['inventory_requests', '/estoque/requisicoes-anteriores'],
    ['inventory_reports', '/estoque/relatorios'],
    ['inventory_suppliers', '/estoque/fornecedores'],
    ['inventory_sectors', '/estoque/setores'],
    ['inventory_categories', '/estoque/categorias'],
    ['inventory_presentations', '/estoque/apresentacoes'],
    ['billing_dashboard', '/faturamento/dashboard'],
    ['billing_reports', '/faturamento/relatorios'],
    ['patients', '/pacientes'], ['insurance_providers', '/cadastros/convenios'],
    ['professionals', '/cadastros/profissionais'], ['procedures', '/cadastros/procedimentos'],
    ['document_templates', '/cadastros/modelos-documentos'],
  ]
  return destinations.find(([module]) => user.permissions?.some(p => p.moduleKey === module && p.canView))?.[1] || '/meu-perfil'
}

const permissionCatalog = [
  ["indicator_panels", "Indicadores — Painéis"],
  ["indicator_analysis", "Indicadores — Análise crítica"],
  ["events", "Eventos — Confirmações"],
  ["guide_billing", "Tratamentos — Faturamento por guia"],
  ["billing_dashboard", "Faturamento — Dashboard analítico"],
  ["billing_reports", "Faturamento — Relatórios"],
  ["guide_processes", "Tratamentos — Gestão de tratamentos"],
  ["patients", "Pacientes"],
  ["insurance_providers", "Convênios"],
  ["professionals", "Profissionais"],
  ["procedures", "Procedimentos"],
  ["document_templates", "Modelos de documentos"],
  ["authorizations", "Tratamentos — Liberação"],
  ["integrations", "Integração Stenci"],
  ["inventory_dashboard", "Estoque — Resumo operacional"],
  ["inventory_stock", "Estoque — Saldos e ajustes"],
  ["inventory_products", "Estoque — Produtos"],
  ["inventory_suppliers", "Estoque — Fornecedores"],
  ["inventory_sectors", "Estoque — Setores"],
  ["inventory_categories", "Estoque — Categorias"],
  ["inventory_presentations", "Estoque — Apresentações"],
  ["inventory_invoices", "Estoque — Notas fiscais"],
  ["inventory_requests", "Estoque — Requisições anteriores"],
  ["inventory_consumptions", "Estoque — Requisições para consumo"],
  ["inventory_purchase_orders", "Estoque — Pedidos de compra"],
  ["inventory_fulfillment", "Estoque — Atendimento de pedidos"],
  ["inventory_reports", "Estoque — Relatórios"],
].map(([key, label]) => ({
  key, label,
  adminOnly: key === 'integrations',
  requires: ({
    authorizations: ['guide_processes'],
    guide_billing: ['guide_processes'],
    procedures: ['insurance_providers'],
    inventory_fulfillment: ['inventory_requests'],
  }[key] || []).map(moduleKey => ({moduleKey, action:'canView'})),
}));
function missingDependencies(permissions) {
  const rows = new Map(permissions.map(row => [row.moduleKey, row]));
  const missing = new Map();
  for (const item of permissionCatalog) {
    if (!rows.get(item.key)?.canView || item.adminOnly) continue;
    for (const required of item.requires) {
      if (!rows.get(required.moduleKey)?.[required.action]) {
        const key=required.moduleKey+':'+required.action;
        if (!missing.has(key)) missing.set(key,{...required,requiredBy:[]});
        missing.get(key).requiredBy.push(item.key);
      }
    }
  }
  return [...missing.values()];
}
module.exports = { permissionCatalog, missingDependencies };

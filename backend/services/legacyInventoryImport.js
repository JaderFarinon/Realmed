const crypto = require('node:crypto')
const { normalizeCode, requestStatus } = require('./inventoryWorkflow')
const keys = {
  apresentacao: 'id_apresentacao',
  categoria: 'id_categoria',
  setor: 'id_setor',
  fornecedor: 'id_fornecedor',
  produto: 'id_produto',
  estoque: 'id_estoque',
  nota: 'cod_nota',
  item: 'id_item',
  pedido: 'cod_pedido',
  item_pedido: 'id_item_pedido',
  usuario: 'id_usuario',
  perfil: 'id_perfil',
}
const digest = (data) =>
  crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
const text = (value, max = 150) => {
  const s = String(value ?? '').trim()
  if (s.length > max) throw Error(`Texto do legado excede ${max} caracteres.`)
  return s || null
}
const qty = (value, min = 0) => {
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < min || n > 2147483647)
    throw Error(
      'Quantidade inválida no legado; exige conferência antes da importação.',
    )
  return n
}
const date = (value) => {
  const s = String(value || '')
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(Date.parse(s)) ||
    new Date(s).toISOString().slice(0, 10) !== s
  )
    throw Error('Data inválida no legado.')
  return s
}
const active = (value) => String(value).toUpperCase() === 'S'
function planLegacyInventory(snapshot) {
  if (
    snapshot.schema !== 'estoque_realmed' ||
    digest(snapshot.data) !== snapshot.fingerprint
  )
    throw Error('Origem ou integridade do snapshot inválida.')
  const data = snapshot.data,
    warnings = [],
    records = [],
    plan = {
      sectors: [],
      categories: [],
      presentations: [],
      suppliers: [],
      products: [],
      invoices: [],
      invoiceItems: [],
      requests: [],
      requestItems: [],
      balances: [],
      warnings,
      records,
    }
  const warn = (table, key, message) =>
    warnings.push({ table, key: String(key), message })
  const index = {}
  for (const [table, key] of Object.entries(keys)) {
    if (!Array.isArray(data[table]))
      throw Error(`Tabela ausente no snapshot: ${table}`)
    index[table] = new Map()
    for (const row of data[table]) {
      if (Object.keys(row).some((k) => /senha|password|token|cookie/i.test(k)))
        throw Error('Snapshot contém dados de autenticação proibidos.')
      const id = String(row[key])
      if (index[table].has(id))
        throw Error(`Identificador duplicado em ${table}.`)
      index[table].set(id, row)
      records.push({ table, key: id, data: row, synthetic: false })
    }
  }
  const synthetic = (table, key, reason) => {
    records.push({
      table,
      key: String(key),
      data: { missing_source: true, reason },
      synthetic: true,
    })
    warn(table, key, reason)
  }
  for (const [table, target, name] of [
    ['setor', 'sectors', 'nome_setor'],
    ['categoria', 'categories', 'nome_categoria'],
    ['apresentacao', 'presentations', 'nome_apresentacao'],
  ]) {
    for (const [key, row] of index[table])
      plan[target].push({
        key,
        attributes: {
          name: text(row[name]) || `Cadastro legado #${key}`,
          description: table === 'setor' ? text(row.descricao, 10000) : null,
          active: active(row.ativo),
        },
      })
  }
  let general = plan.sectors.find(
    (row) => row.attributes.name.toLowerCase() === 'geral',
  )?.key
  if (!general) {
    general = 'default'
    plan.sectors.push({
      key: general,
      attributes: { name: 'Geral', active: true },
    })
    synthetic(
      'setor',
      general,
      'Setor padrão para documentos sem setor original.',
    )
  }
  for (const [key, row] of index.fornecedor)
    plan.suppliers.push({
      key,
      attributes: {
        name: text(row.razao_social) || `Fornecedor legado #${key}`,
        cnpj: text(row.cnpj, 20),
        phone: text(row.telefone, 30),
        email: text(row.email, 255),
        contact_name: text(row.nome_contato, 255),
        active: active(row.ativo),
      },
    })
  const neededProducts = new Set(
    [
      ...data.estoque.map((r) => r.produto),
      ...data.item.map((r) => r.cod_produto),
      ...data.item_pedido.map((r) => r.cod_produto),
    ].map(String),
  )
  for (const [key, row] of index.produto) {
    const code = normalizeCode(row.codigo) || `LEGADO-P${key}`
    if (!row.codigo?.trim())
      warn('produto', key, 'Código ausente: atribuído identificador de origem.')
    if (
      !index.categoria.has(String(row.categoria)) ||
      !index.apresentacao.has(String(row.unidade))
    )
      throw Error('Produto com categoria/apresentação sem referência válida.')
    plan.products.push({
      key,
      category: String(row.categoria),
      presentation: String(row.unidade),
      photo: row.foto || null,
      attributes: {
        code,
        name: text(row.nome_produto) || `Produto legado #${key}`,
        minimum_quantity: qty(row.qtd_minima ?? 0),
        active: true,
      },
    })
  }
  for (const key of neededProducts)
    if (!index.produto.has(key)) {
      if (!plan.categories.some((row) => row.key === 'missing')) {
        plan.categories.push({
          key: 'missing',
          attributes: {
            name: 'Legado — Cadastro Não Identificado',
            active: false,
          },
        })
        synthetic(
          'categoria',
          'missing',
          'Categoria técnica de cadastros excluídos; não representa classificação clínica ou operacional.',
        )
      }
      if (!plan.presentations.some((row) => row.key === 'missing')) {
        plan.presentations.push({
          key: 'missing',
          attributes: {
            name: 'Legado — Apresentação Não Identificada',
            active: false,
          },
        })
        synthetic(
          'apresentacao',
          'missing',
          'Apresentação técnica de produtos excluídos.',
        )
      }
      plan.products.push({
        key,
        category: 'missing',
        presentation: 'missing',
        attributes: {
          code: `LEGADO-P${key}`,
          name: `Produto excluído no legado #${key}`,
          minimum_quantity: 0,
          active: false,
        },
      })
      synthetic(
        'produto',
        key,
        'Produto excluído na origem: preservadas referências e saldo com cadastro inativo identificado pelo ID original.',
      )
    }
  if (
    new Set(plan.products.map((row) => row.attributes.code)).size !==
    plan.products.length
  )
    throw Error('Códigos de produtos duplicados após normalização.')
  for (const [key, row] of index.nota) {
    const supplier = String(row.id_fornecedor)
    if (!plan.suppliers.some((r) => r.key === supplier)) {
      plan.suppliers.push({
        key: supplier,
        attributes: {
          name: `Fornecedor excluído no legado #${supplier}`,
          active: false,
        },
      })
      synthetic(
        'fornecedor',
        supplier,
        'Fornecedor não encontrado: cadastro inativo para preservar a nota histórica.',
      )
    }
    plan.invoices.push({
      key,
      supplier,
      sector: general,
      attributes: {
        number: text(row.numero_nota, 80) || `LEGADO-${key}`,
        invoice_date: date(row.data_nota),
        closed: Boolean(row.fechado),
        notes: `Importado de estoque_realmed.nota #${key}. O legado não registrava setor de recebimento; documento associado ao setor Geral, sem reaplicar entradas.`,
      },
    })
  }
  for (const [key, row] of index.item) {
    if (!index.nota.has(String(row.cod_nota)))
      throw Error('Item de nota sem nota: exige revisão antes de importar.')
    const amount = String(row.valor_item)
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) > 9999999999.99)
      throw Error('Preço inválido no legado.')
    plan.invoiceItems.push({
      key,
      invoice: String(row.cod_nota),
      product: String(row.cod_produto),
      attributes: {
        quantity: qty(row.quantidade, 1),
        unit_price: Number(amount).toFixed(2),
      },
    })
  }
  const missingRequests = new Set(
    data.item_pedido
      .filter((row) => !index.pedido.has(String(row.cod_pedido)))
      .map((row) => String(row.cod_pedido)),
  )
  if (missingRequests.size) {
    plan.sectors.push({
      key: 'unknown',
      attributes: { name: 'Legado — Setor Não Identificado', active: false },
    })
    synthetic(
      'setor',
      'unknown',
      'Setor técnico de pedidos sem cabeçalho original.',
    )
  }
  for (const [key, row] of index.pedido) {
    const user = index.usuario.get(String(row.id_usuario))
    if (!user) throw Error('Solicitante legado não encontrado.')
    const sector = String(user.setor_id || user.setor || general)
    if (!index.setor.has(sector))
      throw Error('Setor do solicitante legado não encontrado.')
    plan.requests.push({
      key,
      user,
      sector,
      attributes: {
        requester_id: null,
        legacy_requester_name: text(user.login),
        request_date: date(row.data_pedido),
        legacy_incomplete: false,
        notes: [
          text(row.obs, 10000),
          `Importado de estoque_realmed.pedido #${key}; solicitante legado #${user.id_usuario}. Setor inferido do cadastro legado do solicitante, pois o pedido não possuía setor próprio.`,
        ]
          .filter(Boolean)
          .join('\n'),
      },
    })
  }
  for (const key of missingRequests) {
    plan.requests.push({
      key,
      user: null,
      sector: 'unknown',
      attributes: {
        requester_id: null,
        legacy_requester_name: 'Não identificado no legado',
        request_date: null,
        legacy_incomplete: true,
        notes: `Cabeçalho do pedido #${key} ausente no legado. Itens recuperados sem presumir solicitante, data ou setor. Corrigir esses dados antes de operar.`,
        status: 'LEGADO_INCOMPLETO',
      },
    })
    synthetic(
      'pedido',
      key,
      'Cabeçalho ausente: itens preservados em pedido recuperado, bloqueado até revisão.',
    )
  }
  for (const [key, row] of index.item_pedido) {
    const requested = qty(
        Number(row.quantidade_solicitada) > 0
          ? row.quantidade_solicitada
          : row.quantidade,
        1,
      ),
      fulfilled = qty(row.quantidade_atendida ?? 0)
    if (fulfilled > requested)
      throw Error('Quantidade atendida excede a solicitada na origem.')
    if (row.flag_baixa === 'S' && fulfilled !== requested)
      throw Error('Baixa antiga ambígua: precisa ser conferida, não inferida.')
    const status =
      fulfilled === requested
        ? 'ATENDIDO'
        : fulfilled > 0
          ? 'PARCIALMENTE_ATENDIDO'
          : row.status_item === 'AGUARDANDO_COMPRA'
            ? 'AGUARDANDO_COMPRA'
            : 'PENDENTE'
    plan.requestItems.push({
      key,
      request: String(row.cod_pedido),
      product: String(row.cod_produto),
      attributes: {
        requested_quantity: requested,
        fulfilled_quantity: fulfilled,
        status,
        notes: text(row.obs, 10000),
      },
    })
  }
  for (const row of plan.requests)
    if (!row.attributes.legacy_incomplete)
      row.attributes.status = requestStatus(
        plan.requestItems
          .filter((i) => i.request === row.key)
          .map((i) => i.attributes),
      )
  const pairs = new Set()
  for (const [key, row] of index.estoque) {
    const sector = String(row.setor_id)
    if (!index.setor.has(sector)) throw Error('Saldo sem setor válido.')
    const pair = String(row.produto) + '|' + sector
    if (pairs.has(pair)) throw Error('Saldo duplicado por produto/setor.')
    pairs.add(pair)
    plan.balances.push({
      key,
      product: String(row.produto),
      sector,
      attributes: { quantity: qty(row.quantidade) },
    })
  }
  plan.summary = {
    sourceCounts: Object.fromEntries(
      Object.entries(data).map(([k, rows]) => [k, rows.length]),
    ),
    products: plan.products.length,
    originalProducts: data.produto.length,
    recoveredProducts: plan.products.length - data.produto.length,
    invoices: plan.invoices.length,
    invoiceItems: plan.invoiceItems.length,
    requests: plan.requests.length,
    recoveredRequests: missingRequests.size,
    requestItems: plan.requestItems.length,
    balanceRows: plan.balances.length,
    totalQuantity: plan.balances.reduce(
      (sum, row) => sum + row.attributes.quantity,
      0,
    ),
    warnings,
  }
  plan.summary.photosReferenced = data.produto.filter((row) => row.foto).length
  return plan
}

async function importLegacyInventory(
  db,
  snapshot,
  { actorId, photoManifest = {} } = {},
) {
  const plan = planLegacyInventory(snapshot)
  for (const asset of Object.values(photoManifest))
    if (!/^[a-f0-9]{64}\.(?:png|jpg)$/.test(asset.filename || ''))
      throw Error('Nome de arquivo de foto inválido.')
  plan.summary.photosCopied = plan.products.filter(
    (row) => row.photo && photoManifest[row.key],
  ).length
  plan.summary.photosMissing =
    plan.summary.photosReferenced - plan.summary.photosCopied
  return db.transaction(async (trx) => {
    const lock = await trx('inventory_sequences')
      .where({ name: 'product_code' })
      .forUpdate()
      .first()
    if (!lock) throw Error('Estrutura de estoque não está instalada.')
    const existing = await trx('inventory_import_runs')
      .where({ source_schema: snapshot.schema })
      .first()
    if (existing) {
      if (existing.fingerprint !== snapshot.fingerprint)
        throw Error(
          'O legado já foi importado com outro snapshot. Uma atualização exige conciliação explícita.',
        )
      return {
        alreadyImported: true,
        runId: existing.id,
        summary:
          typeof existing.summary === 'string'
            ? JSON.parse(existing.summary)
            : existing.summary,
      }
    }
    if (
      !(await trx('users')
        .where({ id: actorId, status: 'active' })
        .whereIn('role', ['admin', 'masteradmin'])
        .first())
    )
      throw Error('Operador da importação deve ser administrador ativo.')
    for (const table of [
      'inventory_products',
      'inventory_balances',
      'inventory_invoices',
      'inventory_requests',
      'inventory_movements',
    ])
      if (Number((await trx(table).count('* as total').first()).total))
        throw Error(
          'O destino já possui operações de estoque. Importação bloqueada para evitar duplicação ou sobrescrita.',
        )
    const [runId] = await trx('inventory_import_runs').insert({
      source_schema: snapshot.schema,
      fingerprint: snapshot.fingerprint,
      captured_at: new Date(snapshot.capturedAt),
      created_by: actorId,
      summary: JSON.stringify(plan.summary),
    })
    const mapping = new Map(),
      sourceTables = {
        sectors: 'setor',
        categories: 'categoria',
        presentations: 'apresentacao',
        suppliers: 'fornecedor',
        products: 'produto',
        invoices: 'nota',
        invoiceItems: 'item',
        requests: 'pedido',
        requestItems: 'item_pedido',
        balances: 'estoque',
      }
    const mapKey = (table, key) => table + '|' + String(key)
    const target = (table, key) => {
      const mapped = mapping.get(mapKey(table, key))
      if (!mapped)
        throw Error(`Referência de importação ausente: ${table} #${key}`)
      return mapped.id
    }
    async function insert(kind, row, attributes, reuseName = false) {
      const table =
        'inventory_' +
        ({ invoiceItems: 'invoice_items', requestItems: 'request_items' }[
          kind
        ] || kind)
      let old = reuseName
        ? await trx(table).where({ name: attributes.name }).first()
        : null
      if (old && kind === 'sectors' && attributes.name === 'Geral') {
      } else if (old)
        throw Error(`Cadastro de destino já existente: ${attributes.name}`)
      const id = old?.id || (await trx(table).insert(attributes))[0]
      mapping.set(mapKey(sourceTables[kind], row.key), { table, id })
      return id
    }
    for (const kind of ['sectors', 'categories', 'presentations', 'suppliers'])
      for (const row of plan[kind])
        await insert(
          kind,
          row,
          row.attributes,
          ['sectors', 'categories', 'presentations'].includes(kind),
        )
    for (const row of plan.products)
      await insert('products', row, {
        ...row.attributes,
        category_id: target('categoria', row.category),
        presentation_id: target('apresentacao', row.presentation),
        photo_path: photoManifest[row.key]?.filename || null,
      })
    const users = await trx('users as u')
      .leftJoin('people as p', 'p.id', 'u.person_id')
      .select('u.id', 'u.username', 'u.stenci_username', 'p.email')
    for (const row of plan.invoices)
      await insert('invoices', row, {
        ...row.attributes,
        supplier_id: target('fornecedor', row.supplier),
        sector_id: target('setor', row.sector),
        created_by: actorId,
      })
    for (const row of plan.invoiceItems)
      await insert('invoiceItems', row, {
        ...row.attributes,
        invoice_id: target('nota', row.invoice),
        product_id: target('produto', row.product),
      })
    for (const row of plan.requests) {
      const login = row.user?.login?.toLowerCase()
      const matches = login
        ? users.filter((u) =>
            [u.username, u.stenci_username, u.email]
              .filter(Boolean)
              .some((value) => value.toLowerCase() === login),
          )
        : []
      await insert('requests', row, {
        ...row.attributes,
        requester_id: matches.length === 1 ? matches[0].id : null,
        sector_id: target('setor', row.sector),
        created_by: actorId,
      })
    }
    for (const row of plan.requestItems)
      await insert('requestItems', row, {
        ...row.attributes,
        request_id: target('pedido', row.request),
        product_id: target('produto', row.product),
      })
    for (const row of plan.balances) {
      const productId = target('produto', row.product),
        sectorId = target('setor', row.sector)
      await insert('balances', row, {
        ...row.attributes,
        product_id: productId,
        sector_id: sectorId,
      })
      await trx('inventory_movements').insert({
        product_id: productId,
        sector_id: sectorId,
        delta: row.attributes.quantity,
        balance_after: row.attributes.quantity,
        kind: 'LEGACY_OPENING',
        user_id: actorId,
        notes: `Saldo inicial da importação #${runId}; estoque_realmed.estoque #${row.key}. Notas e pedidos históricos não foram reaplicados.`,
      })
    }
    for (const record of plan.records) {
      const mapped = mapping.get(mapKey(record.table, record.key))
      await trx('inventory_import_records').insert({
        run_id: runId,
        source_schema: snapshot.schema,
        source_table: record.table,
        source_key: record.key,
        target_table: mapped?.table || null,
        target_id: mapped?.id || null,
        synthetic: record.synthetic,
        source_data: JSON.stringify(record.data),
      })
    }
    const maximum = Math.max(
      0,
      ...plan.products
        .filter((p) => /^\d+$/.test(p.attributes.code))
        .map((p) => Number(p.attributes.code)),
    )
    if (!Number.isSafeInteger(maximum) || maximum > 2147483647)
      throw Error('Código numérico legado excede a sequência suportada.')
    await trx('inventory_sequences')
      .where({ name: 'product_code' })
      .update({ value: Math.max(Number(lock.value), maximum) })
    const totals = await trx('inventory_balances')
      .sum('quantity as quantity')
      .count('* as rows')
      .first()
    if (
      Number(totals.quantity) !== plan.summary.totalQuantity ||
      Number(totals.rows) !== plan.summary.balanceRows
    )
      throw Error('A conciliação final de saldos falhou. Importação revertida.')
    return { alreadyImported: false, runId, summary: plan.summary }
  })
}
module.exports = { planLegacyInventory, importLegacyInventory, digest, keys }

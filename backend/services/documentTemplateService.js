async function cloneIfUsed(trx, templateId, userId) {
  const template = await trx('document_templates').where({ id: templateId }).first()
  if (!template) throw Object.assign(new Error('Modelo não encontrado.'), { status: 404 })
  const used = await trx('guide_process_documents').where({ document_template_id: templateId }).first()
  if (!used) return { templateId, versioned: false }

  const nextVersion = Number((await trx('document_templates').where({ name: template.name }).max('version as version').first()).version || template.version) + 1
  const copy = { ...template, version: nextVersion, active: true, created_by: userId }
  for (const key of ['id', 'created_at', 'updated_at']) delete copy[key]
  const [newId] = await trx('document_templates').insert(copy)
  const fields = await trx('document_template_fields').where({ document_template_id: templateId })
  if (fields.length) await trx('document_template_fields').insert(fields.map((field) => {
    const copyField = { ...field, document_template_id: newId }
    for (const key of ['id', 'created_at', 'updated_at']) delete copyField[key]
    return copyField
  }))
  await trx('document_templates').where({ id: templateId }).update({ active: false })
  await trx('document_template_audit').insert({ document_template_id: newId, user_id: userId, action: 'TEMPLATE_VERSION_CREATED', metadata: JSON.stringify({ previousTemplateId: templateId, previousVersion: template.version }) })
  return { templateId: newId, versioned: true }
}

module.exports = { cloneIfUsed }

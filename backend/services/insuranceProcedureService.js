const codes = require("./procedureCodeService");
const fail = codes.fail;
function validate(body) {
  const code = String(body.code || "").trim(),
    description = String(body.description || "").trim(),
    type = body.type || "PHYSIOTHERAPY",
    table_name = String(body.table_name || "TUSS").trim();
  if (!/^[A-Za-z0-9 .\-/]{3,50}$/.test(code) || !codes.normalize(code))
    throw fail("Informe um código de 3 a 50 caracteres.");
  if (!description || description.length > 255)
    throw fail("Informe a descrição de até 255 caracteres.");
  if (
    !["CONSULTATION", "PHYSIOTHERAPY", "ELECTROSTIMULATION", "OTHER"].includes(
      type,
    ) ||
    table_name.length > 80
  )
    throw fail("Tipo ou tabela inválidos.");
  if (!Array.isArray(body.replaces) || body.replaces.length > 100)
    throw fail("Informe até 100 códigos que este procedimento substitui.");
  const replaces = [];
  for (const item of body.replaces) {
    const value = String(item).trim();
    if (!/^[A-Za-z0-9 .\-/]{3,50}$/.test(value) || !codes.normalize(value))
      throw fail("Código de substituição inválido.");
    if (codes.normalize(value) === codes.normalize(code))
      throw fail("O procedimento não pode substituir o próprio código.");
    if (!replaces.some((v) => codes.normalize(v) === codes.normalize(value)))
      replaces.push(value);
  }
  return {
    code,
    description,
    type,
    table_name,
    replaces,
    active: body.active !== false && body.active !== 0,
  };
}
async function list(db, insurer) {
  const rows = await db("insurance_procedures as ip")
    .join("procedures as p", "p.id", "ip.procedure_id")
    .where("ip.insurance_provider_id", insurer)
    .select("ip.*", "p.code", "p.type", "p.table_name");
  const rules = await db("procedure_code_rules").where({
    insurance_provider_id: insurer,
    active: true,
  });
  return rows.map((row) => ({
    ...row,
    replaces:
      !row.active && row.source_codes
        ? typeof row.source_codes === "string"
          ? JSON.parse(row.source_codes)
          : row.source_codes
        : [
            ...new Set(
              rules
                .filter((r) => r.target_procedure_id === row.procedure_id)
                .map((r) => r.source_code),
            ),
          ],
  }));
}
async function save(db, insurer, body, linkId = null) {
  const values = validate(body);
  return db.transaction(async (trx) => {
    const provider = await trx("insurance_providers")
      .where({ id: insurer })
      .forUpdate()
      .first();
    if (!provider) throw fail("Convênio não encontrado.");
    const old = linkId
      ? await trx("insurance_procedures")
          .where({ id: linkId, insurance_provider_id: insurer })
          .first()
      : null;
    if (linkId && !old)
      throw fail("Procedimento não pertence a este convênio.");
    let procedure = old
      ? await trx("procedures").where({ id: old.procedure_id }).first()
      : await trx("procedures").where({ code: values.code }).first();
    if (old && procedure.code !== values.code)
      throw fail(
        "O código de um procedimento existente não pode ser alterado. Cadastre o novo código.",
      );
    if (
      procedure &&
      (procedure.type !== values.type ||
        codes.normalize(procedure.table_name) !==
          codes.normalize(values.table_name))
    )
      throw fail(
        "Este código já está cadastrado com outro tipo ou tabela. Utilize os dados existentes.",
      );
    if (procedure && !procedure.active && values.active)
      throw fail(
        "Este código está inativo no catálogo geral anterior. Reative-o antes de utilizá-lo no convênio.",
      );
    if (!procedure) {
      const [id] = await trx("procedures").insert({
        code: values.code,
        description: values.description,
        type: values.type,
        table_name: values.table_name,
        active: true,
      });
      procedure = { id };
    }
    if (
      !old &&
      (await trx("insurance_procedures")
        .where({ insurance_provider_id: insurer, procedure_id: procedure.id })
        .first())
    )
      throw fail("Este procedimento já está cadastrado neste convênio.");
    const rules = await trx("procedure_code_rules").where({
      insurance_provider_id: insurer,
    });
    for (const source of values.replaces) {
      if (
        values.active &&
        rules.some(
          (r) =>
            r.active &&
            codes.normalize(r.source_code) === codes.normalize(source) &&
            r.target_procedure_id !== procedure.id,
        )
      )
        throw fail(
          `O código ${source} já é substituído por outro procedimento neste convênio. Revise o cadastro existente.`,
        );
      const known = await trx("procedures").where({ code: source }).first();
      if (known && known.type !== values.type)
        throw fail("Origem e destino devem ter o mesmo tipo de procedimento.");
    }
    let id = old?.id;
    const data = {
      description: values.description,
      active: values.active,
      source_codes: JSON.stringify(values.replaces),
    };
    if (id) await trx("insurance_procedures").where({ id }).update(data);
    else
      [id] = await trx("insurance_procedures").insert({
        ...data,
        insurance_provider_id: insurer,
        procedure_id: procedure.id,
      });
    for (const rule of rules.filter(
      (r) => r.target_procedure_id === procedure.id,
    ))
      if (
        !values.active ||
        !values.replaces.some(
          (source) =>
            codes.normalize(source) === codes.normalize(rule.source_code),
        )
      )
        await trx("procedure_code_rules")
          .where({ id: rule.id })
          .update({ active: false });
    for (const source of values.replaces) {
      const existing = rules.filter(
        (r) =>
          r.target_procedure_id === procedure.id &&
          codes.normalize(r.source_code) === codes.normalize(source),
      );
      if (existing.length) {
        for (const rule of existing)
          await trx("procedure_code_rules")
            .where({ id: rule.id })
            .update({ active: values.active });
      } else
        await trx("procedure_code_rules").insert({
          insurance_provider_id: insurer,
          target_procedure_id: procedure.id,
          source_code: source,
          priority: 1,
          active: values.active,
        });
    }
    return (await list(trx, insurer)).find((row) => row.id === id);
  });
}
async function replicate(db, sourceId, destinationIds, procedureIds) {
  if (
    !Array.isArray(procedureIds) ||
    !procedureIds.length ||
    procedureIds.length > 10000 ||
    procedureIds.some((id) => !Number.isSafeInteger(id) || id < 1)
  )
    throw fail("Selecione ao menos um procedimento válido para copiar.");
  if (
    !Number.isSafeInteger(sourceId) ||
    sourceId < 1 ||
    !Array.isArray(destinationIds) ||
    !destinationIds.length ||
    destinationIds.length > 100 ||
    destinationIds.some(
      (id) => !Number.isSafeInteger(id) || id < 1 || id === sourceId,
    )
  )
    throw fail(
      "Selecione a origem e de um a 100 convênios de destino diferentes da origem.",
    );
  const destinations = [...new Set(destinationIds)];
  return db.transaction(async (trx) => {
    const providers = await trx("insurance_providers")
      .whereIn("id", [sourceId, ...destinations])
      .orderBy("id")
      .forUpdate();
    if (providers.length !== destinations.length + 1)
      throw fail("Convênio não encontrado. Atualize a lista.");
    const source = await trx("insurance_procedures")
      .whereIn("procedure_id", [...new Set(procedureIds)])
      .where({
        insurance_provider_id: sourceId,
      });
    if (source.length !== new Set(procedureIds).size)
      throw fail(
        "Algum procedimento selecionado não pertence ao convênio de origem. Atualize a lista.",
      );
    const sourceRules = await trx("procedure_code_rules").where({
      insurance_provider_id: sourceId,
    });
    const results = [];
    for (const destination of destinations) {
      const existing = await trx("insurance_procedures").where({
        insurance_provider_id: destination,
      });
      const rules = await trx("procedure_code_rules").where({
        insurance_provider_id: destination,
      });
      let copied = 0,
        skipped = 0;
      for (const row of source) {
        if (existing.some((item) => item.procedure_id === row.procedure_id)) {
          skipped++;
          continue;
        }
        const incoming = sourceRules.filter(
          (rule) => rule.target_procedure_id === row.procedure_id,
        );
        for (const rule of incoming) {
          if (
            rule.active &&
            rules.some(
              (other) =>
                other.active &&
                codes.normalize(other.source_code) ===
                  codes.normalize(rule.source_code) &&
                other.target_procedure_id !== rule.target_procedure_id,
            )
          ) {
            throw fail(
              `Conflito no convênio ${providers.find((p) => p.id === destination).name}: o código ${rule.source_code} já possui outro substituto. Nenhum procedimento foi replicado.`,
            );
          }
        }
        await trx("insurance_procedures").insert({
          insurance_provider_id: destination,
          procedure_id: row.procedure_id,
          description: row.description,
          active: row.active,
          source_codes:
            typeof row.source_codes === "string"
              ? row.source_codes
              : JSON.stringify(row.source_codes || []),
        });
        for (const rule of incoming) {
          // Preserve advanced rule qualifiers; never overwrite a destination's existing rule.
          const fields = [
            "source_code",
            "source_description",
            "source_table",
            "target_procedure_id",
            "priority",
            "valid_from",
            "valid_until",
            "active",
            "notes",
          ];
          const data = Object.fromEntries(
            fields.map((field) => [field, rule[field]]),
          );
          const duplicate = rules.some((other) =>
            fields.every(
              (field) =>
                String(other[field] ?? "") === String(rule[field] ?? ""),
            ),
          );
          if (!duplicate) {
            await trx("procedure_code_rules").insert({
              ...data,
              insurance_provider_id: destination,
            });
            rules.push(data);
          }
        }
        copied++;
      }
      results.push({
        insurance_provider_id: destination,
        name: providers.find((p) => p.id === destination).name,
        copied,
        skipped,
      });
    }
    return { source_id: sourceId, results };
  });
}
async function linkExisting(db, insurer, procedureIds) {
  if (!Array.isArray(procedureIds) || !procedureIds.length || procedureIds.length > 1000 ||
      procedureIds.some(id => !Number.isSafeInteger(id) || id < 1))
    throw fail("Selecione de um a 1000 procedimentos do catálogo geral.");
  const ids = [...new Set(procedureIds)];
  return db.transaction(async trx => {
    const provider = await trx("insurance_providers").where({ id: insurer }).forUpdate().first();
    if (!provider) throw fail("Convênio não encontrado.");
    const procedures = await trx("procedures").whereIn("id", ids).orderBy("id").forUpdate();
    if (procedures.length !== ids.length || procedures.some(row => !row.active))
      throw fail("Algum procedimento não existe ou está inativo no catálogo geral. Atualize a lista.");
    const existing = await trx("insurance_procedures").where({ insurance_provider_id: insurer }).whereIn("procedure_id", ids);
    const pending = procedures.filter(row => !existing.some(link => link.procedure_id === row.id));
    if (pending.length) await trx("insurance_procedures").insert(pending.map(row => ({
      insurance_provider_id: insurer, procedure_id: row.id,
      description: row.description, active: true, source_codes: JSON.stringify([]),
    })));
    // Linking does not copy, enable or rewrite substitution rules, or reactivate existing links.
    return { linked: pending.length, existing: existing.length };
  });
}
module.exports = { validate, list, save, replicate, linkExisting };

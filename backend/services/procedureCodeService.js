const crypto = require("crypto");
const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
const fail = (message) => Object.assign(new Error(message), { status: 422 });
const day = (value) =>
  value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value || "").slice(0, 10);
function applicable(rule, insurer, date) {
  return (
    Boolean(rule.active) &&
    Boolean(rule.target_active) &&
    (!rule.insurance_provider_id ||
      Number(rule.insurance_provider_id) === Number(insurer)) &&
    (!rule.valid_from || day(rule.valid_from) <= date) &&
    (!rule.valid_until || day(rule.valid_until) >= date)
  );
}
function choose(
  source,
  rules,
  insurer,
  date = new Date().toISOString().slice(0, 10),
) {
  const candidates = rules.filter(
    (rule) =>
      applicable(rule, insurer, date) &&
      normalize(rule.source_code) === normalize(source.code) &&
      (!rule.source_table ||
        normalize(rule.source_table) === normalize(source.table_name)),
  );
  const rank = (rule) => [
    rule.insurance_provider_id ? 0 : 1,
    rule.source_table ? 0 : 1,
    Number(rule.priority),
  ];
  candidates.sort((a, b) => {
    const x = rank(a),
      y = rank(b);
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2] || a.id - b.id;
  });
  if (!candidates.length)
    return {
      ...source,
      mapping_rule_id: null,
      source_code: source.code,
      source_description: source.description,
      mapping_reason: "Código original: sem de/para aplicável.",
    };
  const best = candidates[0],
    peers = candidates.filter(
      (rule) => JSON.stringify(rank(rule)) === JSON.stringify(rank(best)),
    );
  if (new Set(peers.map((rule) => Number(rule.target_procedure_id))).size > 1)
    throw fail(
      `De/para ambíguo para ${source.code}. Ajuste as prioridades do cadastro.`,
    );
  if (source.type && best.target_type !== source.type)
    throw fail(
      `O de/para de ${source.code} altera o tipo do procedimento. Revise o cadastro.`,
    );
  return {
    ...source,
    code: best.target_code,
    description: best.target_description,
    table_name: best.target_table,
    type: best.target_type,
    mapping_rule_id: best.id,
    target_procedure_id: best.target_procedure_id,
    source_code: source.code,
    source_description: source.description,
    mapping_reason: `${best.insurance_provider_id ? "Regra do convênio" : "Regra geral"} · prioridade ${best.priority}`,
  };
}
async function loadRules(db) {
  return db("procedure_code_rules as r")
    .join("procedures as p", "p.id", "r.target_procedure_id")
    .leftJoin("insurance_procedures as ip", function () {
      this.on("ip.procedure_id", "=", "p.id").andOn(
        "ip.insurance_provider_id",
        "=",
        "r.insurance_provider_id",
      );
    })
    .select(
      "r.*",
      "p.code as target_code",
      db.raw("COALESCE(ip.description,p.description) as target_description"),
      "p.table_name as target_table",
      "p.type as target_type",
      db.raw("(p.active AND COALESCE(ip.active,1)) as target_active"),
    )
    .orderBy("r.id");
}
async function resolve(db, procedures, insurer) {
  if (!procedures.length) return [];
  const rules = await loadRules(db);
  const links = await db("insurance_procedures as ip")
    .join("procedures as p", "p.id", "ip.procedure_id")
    .where("ip.insurance_provider_id", insurer || 0)
    .select("ip.description", "ip.active", "p.code");
  return procedures.map((source) => {
    const link = links.find(
      (p) => normalize(p.code) === normalize(source.code),
    );
    return choose(
      link?.active ? { ...source, description: link.description } : source,
      rules,
      insurer,
    );
  });
}
async function catalog(db, insurer) {
  const rows = await db("procedures").where({ active: true });
  const links = await db("insurance_procedures").where({
    insurance_provider_id: insurer || 0,
  });
  return rows
    .filter((p) => !links.some((l) => l.procedure_id === p.id && !l.active))
    .map((p) => ({
      ...p,
      description:
        links.find((l) => l.procedure_id === p.id)?.description ||
        p.description,
    }));
}
function containsCode(text, code) {
  const characters = normalize(code)
    .split("")
    .map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return (
    characters.length >= 3 &&
    new RegExp(
      `(?<![A-Z0-9])${characters.join("[ .\\-/]*")}(?![A-Z0-9])`,
      "i",
    ).test(text)
  );
}
function recognize(text, catalog, rules, insurer) {
  const sources = new Map();
  const add = (source) => {
    const key = normalize(source.code) + "|" + normalize(source.table_name);
    if (!sources.has(key)) sources.set(key, source);
  };
  for (const item of catalog.filter((p) => p.active))
    if (
      containsCode(text, item.code) ||
      (normalize(item.description).length >= 12 &&
        normalize(text).includes(normalize(item.description)))
    )
      add({ ...item, procedure_id: item.id });
  for (const rule of rules.filter((r) =>
    applicable(r, insurer, new Date().toISOString().slice(0, 10)),
  )) {
    if (
      containsCode(text, rule.source_code) ||
      (normalize(rule.source_description).length >= 12 &&
        normalize(text).includes(normalize(rule.source_description)))
    ) {
      const original = catalog.find(
        (p) =>
          p.active &&
          normalize(p.code) === normalize(rule.source_code) &&
          (!rule.source_table ||
            normalize(p.table_name) === normalize(rule.source_table)),
      );
      add(
        original
          ? { ...original, procedure_id: original.id }
          : {
              code: rule.source_code,
              description: rule.source_description || rule.source_code,
              table_name: rule.source_table,
              type: rule.target_type,
            },
      );
    }
  }
  return [...sources.values()].map((source, index) => {
    try {
      return {
        candidate_id: String(index + 1),
        source,
        proposed: choose(source, rules, insurer),
      };
    } catch (error) {
      return { candidate_id: String(index + 1), source, error: error.message };
    }
  });
}
function fingerprint(items) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(items))
    .digest("hex");
}
module.exports = {
  catalog,
  normalize,
  choose,
  resolve,
  loadRules,
  recognize,
  fingerprint,
  fail,
  day,
};

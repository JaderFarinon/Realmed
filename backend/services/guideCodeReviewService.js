const crypto = require("crypto");
const fs = require("fs/promises");
const codes = require("./procedureCodeService");
const reviews = new Map();
const hash = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");
function remember(data) {
  for (const [key, value] of reviews)
    if (value.expires < Date.now()) reviews.delete(key);
  if (reviews.size >= 100)
    throw Object.assign(
      new Error("Muitas conferências abertas. Tente novamente mais tarde."),
      { status: 429 },
    );
  const key = crypto.randomUUID();
  reviews.set(key, { ...data, expires: Date.now() + 15 * 60 * 1000 });
  return key;
}
function find(key, userId, processId) {
  const row = reviews.get(key);
  if (
    !row ||
    row.expires < Date.now() ||
    Number(row.userId) !== Number(userId) ||
    Number(row.processId) !== Number(processId)
  )
    throw Object.assign(
      new Error("Conferência expirada. Leia novamente a guia original."),
      { status: 409 },
    );
  return row;
}
async function reviewedProcedures(db, body, userId, processId, insurer) {
  const review = find(body.code_review_id, userId, processId);
  const original = await db("guide_process_documents")
    .where({
      id: review.documentId,
      guide_process_id: processId,
      document_role: "RECEIVED",
    })
    .whereNull("deleted_at")
    .first();
  if (!original || hash(await fs.readFile(review.file)) !== review.hash)
    throw Object.assign(
      new Error("A guia original mudou. Faça uma nova leitura."),
      { status: 409 },
    );
  const rules = await codes.loadRules(db);
  if (
    codes.fingerprint(rules) !== review.rulesHash ||
    Number(insurer) !== Number(review.insurer)
  )
    throw Object.assign(
      new Error(
        "O convênio ou de/para mudou. Faça uma nova leitura para conferir os códigos.",
      ),
      { status: 409 },
    );
  if (
    !Array.isArray(body.review_items) ||
    !body.review_items.length ||
    body.review_items.length > 5
  )
    throw codes.fail("Selecione de um a cinco procedimentos para a guia.");
  const catalog = await codes.catalog(db, insurer);
  if (review.catalogHash && codes.fingerprint(catalog) !== review.catalogHash)
    throw Object.assign(
      new Error(
        "Os procedimentos do convênio mudaram. Leia novamente a guia original.",
      ),
      { status: 409 },
    );
  const seen = new Set();
  const procedures = body.review_items.map((item) => {
    let source;
    if (item.candidate_id)
      source = review.candidates.find(
        (candidate) => candidate.candidate_id === String(item.candidate_id),
      )?.source;
    else {
      const procedure = catalog.find(
        (p) => Number(p.id) === Number(item.procedure_id),
      );
      if (procedure) source = { ...procedure, procedure_id: procedure.id };
    }
    if (!source)
      throw codes.fail(
        "Procedimento não reconhecido. Faça uma nova conferência.",
      );
    const key =
      codes.normalize(source.code) + "|" + codes.normalize(source.table_name);
    if (seen.has(key))
      throw codes.fail("Não repita o mesmo procedimento na guia.");
    seen.add(key);
    const quantity = Number(item.requested_quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999)
      throw codes.fail(
        "Informe quantidades inteiras de 1 a 999 após conferir o original.",
      );
    return codes.choose(
      { ...source, requested_quantity: quantity, authorized_quantity: null },
      rules,
      insurer,
    );
  });
  return { procedures, sourceDocumentId: original.id, sourcePage: review.page };
}
module.exports = { remember, find, reviewedProcedures, hash };

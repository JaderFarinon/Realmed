const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const codes = require("../services/procedureCodeService");
const review = require("../services/guideCodeReviewService");
const source = {
  id: 1,
  procedure_id: 1,
  code: "001.234-56",
  description: "Fisioterapia original",
  table_name: "TUSS",
  type: "PHYSIOTHERAPY",
  active: 1,
};
const rule = (override = {}) => ({
  id: 1,
  source_code: "00123456",
  insurance_provider_id: null,
  active: 1,
  target_active: 1,
  target_procedure_id: 2,
  target_code: "87654321",
  target_description: "Fisioterapia alternativa",
  target_type: "PHYSIOTHERAPY",
  target_table: "TUSS",
  priority: 1,
  ...override,
});
test("insurance-specific mapping precedes general priority and does not leak across insurers", () => {
  const rules = [
    rule(),
    rule({
      id: 2,
      insurance_provider_id: 10,
      priority: 99,
      target_code: "11112222",
    }),
  ];
  assert.equal(codes.choose(source, rules, 10).code, "11112222");
  assert.equal(codes.choose(source, rules, 11).code, "87654321");
  assert.equal(codes.choose(source, rules, 10).source_code, "001.234-56");
});
test("table, validity, active target and ascending priority control eligible alternatives", () => {
  const rules = [
    rule({ id: 1, target_code: "EXPIRED", valid_until: "2020-01-01" }),
    rule({ id: 2, target_code: "INACTIVE", active: 0 }),
    rule({ id: 3, target_code: "FUTURE", valid_from: "2099-01-01" }),
    rule({ id: 4, target_code: "TARGET_INACTIVE", target_active: 0 }),
    rule({ id: 5, target_code: "OTHER_TABLE", source_table: "CBHPM" }),
    rule({ id: 6, target_code: "GENERAL", priority: 1 }),
    rule({ id: 7, target_code: "TABLE", source_table: "TUSS", priority: 20 }),
  ];
  assert.equal(codes.choose(source, rules, 10).code, "TABLE");
  assert.equal(
    codes.choose(
      source,
      [
        rule({ priority: 2 }),
        rule({ id: 2, priority: 1, target_code: "FIRST" }),
      ],
      10,
    ).code,
    "FIRST",
  );
});
test("ties never silently choose a different target and clinical categories cannot be changed", () => {
  assert.throws(
    () =>
      codes.choose(
        source,
        [rule(), rule({ id: 2, target_procedure_id: 3 })],
        10,
      ),
    /ambíguo/,
  );
  assert.throws(
    () => codes.choose(source, [rule({ target_type: "CONSULTATION" })], 10),
    /tipo do procedimento/,
  );
  assert.equal(codes.choose(source, [], 10).code, source.code);
  assert.equal(codes.choose(source, [], 10).mapping_rule_id, null);
});
test("mapping is one hop and never changes requested or authorized quantities", () => {
  const result = codes.choose(
    { ...source, requested_quantity: 20, authorized_quantity: 10 },
    [rule(), rule({ id: 2, source_code: "87654321", target_code: "99999999" })],
    10,
  );
  assert.equal(result.code, "87654321");
  assert.equal(result.requested_quantity, 20);
  assert.equal(result.authorized_quantity, 10);
});
test("recognition retains leading zeros, ignores partial codes and reports conflicts", () => {
  const result = codes.recognize(
    "Procedimento 001.234-56 — fisioterapia",
    [source],
    [rule()],
    10,
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].proposed.code, "87654321");
  assert.equal(
    codes.recognize("Código 9001234569", [source], [rule()], 10).length,
    0,
  );
  assert.equal(codes.recognize("123456", [source], [rule()], 10).length, 0);
  const conflict = codes.recognize(
    "00123456",
    [source],
    [rule(), rule({ id: 2, target_procedure_id: 3 })],
    10,
  );
  assert.match(conflict[0].error, /ambíguo/);
});
test("only explicitly registered descriptions are recognized, without fuzzy clinical inference", () => {
  const rules = [
    rule({
      source_code: "88990011",
      source_description: "Sessão de fisioterapia motora",
    }),
  ];
  assert.equal(
    codes.recognize("SESSAO DE FISIOTERAPIA MOTORA", [], rules, 10).length,
    1,
  );
  assert.equal(
    codes.recognize("Sessão de fisioterapia respiratória", [], rules, 10)
      .length,
    0,
  );
});
test("review keys are scoped to user and treatment and invalid keys expire safely", () => {
  const key = review.remember({ userId: 1, processId: 2 });
  assert.equal(review.find(key, 1, 2).userId, 1);
  assert.throws(() => review.find(key, 2, 2), /expirada/);
  assert.throws(() => review.find(key, 1, 3), /expirada/);
  assert.throws(() => review.find("unknown", 1, 2), /expirada/);
});
test("review revalidates the original, rule fingerprint and quantities without writing the original", async () => {
  const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), "realmed-review-test-"),
    ),
    file = path.join(directory, "original.pdf");
  const original = Buffer.from("%PDF-fictitious-test-original");
  await fs.writeFile(file, original);
  let rules = [rule()],
    doc = { id: 9 },
    catalog = [source];
  const db = (table) => {
    const rows = table.startsWith("insurance_procedures")
      ? []
      : table === "procedure_code_rules as r"
        ? rules
        : table === "guide_process_documents"
          ? [doc]
          : catalog;
    const q = {
      then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
      first: async () => rows[0],
    };
    for (const method of [
      "where",
      "whereNull",
      "join",
      "leftJoin",
      "select",
      "orderBy",
    ])
      q[method] = () => q;
    return q;
  };
  db.raw = (sql) => sql;
  try {
    const key = review.remember({
      userId: 1,
      processId: 2,
      documentId: 9,
      file,
      hash: review.hash(original),
      rulesHash: codes.fingerprint(rules),
      insurer: 10,
      candidates: [{ candidate_id: "1", source }],
      page: 1,
    });
    const body = {
      code_review_id: key,
      review_items: [{ candidate_id: "1", requested_quantity: 20 }],
    };
    const result = await review.reviewedProcedures(db, body, 1, 2, 10);
    assert.equal(result.sourceDocumentId, 9);
    assert.equal(result.procedures[0].code, "87654321");
    assert.equal(result.procedures[0].requested_quantity, 20);
    assert.deepEqual(await fs.readFile(file), original);
    await assert.rejects(
      review.reviewedProcedures(
        db,
        {
          ...body,
          review_items: [{ candidate_id: "1", requested_quantity: 0 }],
        },
        1,
        2,
        10,
      ),
      /quantidades/,
    );
    await assert.rejects(
      review.reviewedProcedures(
        db,
        { ...body, review_items: [...body.review_items, ...body.review_items] },
        1,
        2,
        10,
      ),
      /repita/,
    );
    rules = [rule({ priority: 2 })];
    await assert.rejects(
      review.reviewedProcedures(db, body, 1, 2, 10),
      /de\/para mudou/,
    );
    rules = [rule()];
    await fs.writeFile(file, "changed");
    await assert.rejects(
      review.reviewedProcedures(db, body, 1, 2, 10),
      /original mudou/,
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

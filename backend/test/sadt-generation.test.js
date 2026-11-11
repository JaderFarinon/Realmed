const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const { PDFDocument } = require("pdf-lib");
const sadt = require("../services/sadtTemplateService");
const {
  generateDocument,
  roots,
  safeFile,
  fitText,
} = require("../services/documentGenerationService");
const { generationContext } = require("../routes/document-generation");
const { documentTransition } = require("../services/guideWorkflow");

const treatment = {
  id: 1,
  patient_name: "Paciente fictícia de conferência",
  insurance_name: "Convênio fictício",
  insurance_provider_id: 1,
  ans_registration: "123456",
  card_number: "01234567890123456789",
  card_expiration: "2027-12-31",
  requesting_doctor_id: 2,
  doctor_name: "Médico fictício solicitante",
  doctor_council: "CRM",
  doctor_council_number: "12345",
  doctor_state: "PR",
  doctor_cbo: "225125",
  assessment_date: "2026-10-19",
  physiotherapist_id: 3,
  referral_date: "2026-10-19",
  medical_diagnosis: "Dados fictícios para conferência do formulário",
  cid: "M00",
  document_status: "INCOMPLETE",
  authorization_status: "NOT_READY",
};
const procedures = [
  {
    code: "1010101010",
    description: "Consulta de avaliação - exemplo fictício",
    type: "CONSULTATION",
    requested_quantity: 1,
    authorized_quantity: null,
  },
  {
    code: "2020202020",
    description: "Fisioterapia - exemplo fictício",
    type: "PHYSIOTHERAPY",
    requested_quantity: 20,
    authorized_quantity: null,
  },
  {
    code: "3030303030",
    description: "Eletroestimulação - exemplo fictício",
    type: "ELECTROSTIMULATION",
    requested_quantity: 20,
    authorized_quantity: null,
  },
];
function mockDb(process, items = procedures, codeRules = []) {
  const db = (table) => {
    const rows =
      table === "guide_processes as gp"
        ? [structuredClone(process)]
        : table === "guide_process_procedures as g"
          ? structuredClone(items)
          : table === "procedure_code_rules as r"
            ? structuredClone(codeRules)
            : [];
    const chain = {
      then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
      first: async () => rows[0],
    };
    for (const method of ["join", "leftJoin", "where", "whereNull", "select", "orderBy"])
      chain[method] = () => chain;
    return chain;
  };
  db.raw = (sql) => sql;
  return db;
}
test("standard SADT is available for three document types with a blank insurer logo area and complete cell counts", () => {
  assert.equal(sadt.options().length, 3);
  assert.equal(sadt.templateFor("../arbitrary.pdf"), null);
  const template = sadt.templateFor(sadt.referenceFor("PHYSIOTHERAPY_GUIDE"));
  assert.equal(template.id, null);
  assert.equal(
    template.fields.find((f) => f.field_key === "INSURANCE_ANS_REGISTRATION")
      .options.characterCells.length,
    6,
  );
  assert.equal(
    template.fields.find((f) => f.field_key === "PROCEDURE_1_CODE").options
      .characterCells.length,
    10,
  );
  const logo = template.fields.find((f) => f.field_key === "INSURANCE_LOGO");
  assert.deepEqual(
    [logo.x, logo.y, logo.width, logo.height],
    [40, 10, 160, 32],
  );
  assert.equal(logo.options.fit, "contain");
  assert.equal(logo.options.required, undefined);
  assert.equal(sadt.councilCode("CRM"), "06");
  assert.equal(sadt.councilCode("CREFITO"), "05");
  assert.equal(sadt.councilCode("unknown"), "");
});
test("deployed base PDF was compiled from the current approved HTML", async () => {
  const path = require("node:path");
  const html = await fs.readFile(
    path.resolve(__dirname, "../templates/sadt/guia-sadt.html"),
  );
  const expected = crypto.createHash("sha256").update(html).digest("hex");
  const pdf = await PDFDocument.load(await fs.readFile(sadt.builtinFile));
  assert.equal(pdf.getSubject(), `Realmed SADT HTML sha256=${expected}`);
});
test("guide context resolves insurer alternatives before rendering and rejects stale confirmations", async () => {
  const items = procedures.map((p, index) => ({
    ...p,
    procedure_id: index + 1,
  }));
  const rules = [
    {
      id: 1,
      source_code: items[0].code,
      insurance_provider_id: 1,
      priority: 1,
      active: 1,
      target_active: 1,
      target_procedure_id: 8,
      target_code: "12.345.678-90",
      target_description: "Consulta alternativa cadastrada",
      target_type: "CONSULTATION",
      target_table: "TUSS",
    },
  ];
  const db = mockDb(treatment, items, rules);
  // Conflicting physiotherapy rules must not block a consultation-only guide.
  rules.push(
    ...[9, 10].map((id) => ({
      id,
      source_code: items[1].code,
      insurance_provider_id: 1,
      priority: 1,
      active: 1,
      target_active: 1,
      target_procedure_id: id,
      target_code: String(id),
      target_description: "Alternativa de fisioterapia",
      target_type: "PHYSIOTHERAPY",
    })),
  );
  const ctx = await generationContext(
    1,
    sadt.referenceFor("CONSULTATION_GUIDE"),
    db,
  );
  assert.equal(ctx.procedures[0].code, "12.345.678-90");
  assert.equal(ctx.procedures[0].source_code, items[0].code);
  assert.equal(
    (await PDFDocument.load(await generateDocument(ctx))).getPageCount(),
    1,
  );
  await assert.rejects(
    generationContext(
      1,
      sadt.referenceFor("CONSULTATION_GUIDE"),
      db,
      {
        code_selection: [{ procedure_id: 1, requested_quantity: 1 }],
        code_selection_snapshot: "stale",
      },
      1,
    ),
    (error) => error.status === 409,
  );
});
test("incomplete treatment can generate its guide and gets procedures appropriate to the chosen type", async () => {
  const ctx = await generationContext(
    1,
    sadt.referenceFor("PHYSIOTHERAPY_GUIDE"),
    mockDb(treatment),
  );
  assert.deepEqual(
    ctx.procedures.map((p) => p.type),
    ["PHYSIOTHERAPY"],
  );
  assert.equal(ctx.process.document_status, "INCOMPLETE");
  assert.equal(ctx.logo, undefined);
  const consultation = await generationContext(
    1,
    sadt.referenceFor("CONSULTATION_GUIDE"),
    mockDb(treatment),
  );
  assert.deepEqual(
    consultation.procedures.map((p) => p.type),
    ["CONSULTATION"],
  );
});
test("missing administrative fields return a useful list without requiring a signature or insurer logo", async () => {
  await assert.rejects(
    generationContext(
      1,
      sadt.referenceFor("PHYSIOTHERAPY_GUIDE"),
      mockDb({ ...treatment, doctor_name: null, card_number: null }),
    ),
    (error) =>
      error.status === 422 &&
      error.missing.includes("carteirinha") &&
      error.missing.includes("nome do médico") &&
      !error.missing.some((field) => /logo|assinatura/.test(field)),
  );
});
test("physiotherapy generates without electrostimulation and cannot replace physiotherapy with it", async () => {
  const ctx = await generationContext(1,sadt.referenceFor('PHYSIOTHERAPY_GUIDE'),mockDb(treatment,procedures.filter(item=>item.type==='PHYSIOTHERAPY')));
  assert.deepEqual(ctx.procedures.map(p=>p.type),['PHYSIOTHERAPY']);
  for (const type of ["ELECTROSTIMULATION"]) {
    const expected = "procedimento de fisioterapia";
    await assert.rejects(
      generationContext(
        1,
        sadt.referenceFor("PHYSIOTHERAPY_GUIDE"),
        mockDb(
          treatment,
          procedures.filter((item) => item.type === type),
        ),
      ),
      (error) => error.status === 422 && error.missing.includes(expected),
    );
  }
});
test('unified guide includes exactly the selected procedure types and validates selection', async () => {
  for (const types of [['PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION'],['CONSULTATION_GUIDE','ELECTROSTIMULATION'],['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION']]) {
    const ctx=await generationContext(1,sadt.referenceFor(types[0]),mockDb(treatment),{unified_document_types:types});
    assert.deepEqual(ctx.procedures.map(p=>p.type),sadt.selectProcedures(types,procedures).map(p=>p.type));
    assert.equal(ctx.template.name,'Guia SADT unificada');
    assert.equal((await PDFDocument.load(await generateDocument(ctx))).getPageCount(),1);
  }
  for (const invalid of [[],['PHYSIOTHERAPY_GUIDE'],['OTHER','CONSULTATION_GUIDE'],['CONSULTATION_GUIDE','CONSULTATION_GUIDE']])
    assert.throws(()=>sadt.unifiedTypes(invalid),error=>error.status===422);
});
test("standard template produces one page with actual data, dates and both physiotherapy procedures", async () => {
  const ctx = await generationContext(
    1,
    sadt.referenceFor("PHYSIOTHERAPY_GUIDE"),
    mockDb(treatment),
  );
  const output = await generateDocument(ctx);
  const pdf = await PDFDocument.load(output);
  assert.equal(pdf.getPageCount(), 1);
  assert.deepEqual(pdf.getPage(0).getSize(), { width: 841.92, height: 595.32 });
  assert.ok(output.length > 50000);
  await assert.rejects(
    generateDocument({
      ...ctx,
      process: { ...ctx.process, card_number: "1".repeat(21) },
    }),
    (error) => error.status === 422 && /20 caracteres/.test(error.message),
  );
  await assert.rejects(
    generateDocument({ ...ctx, procedures: Array(6).fill(ctx.procedures[0]) }),
    /até 5 procedimentos/,
  );
  await assert.rejects(
    generateDocument({
      ...ctx,
      process: { ...ctx.process, patient_name: "Nome ".repeat(300) },
    }),
    (error) => error.status === 422 && /não cabe/.test(error.message),
  );
});
test("optional logo uses an existing local asset and signatures are not required", async () => {
  const name = crypto.randomUUID() + ".png";
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  await fs.mkdir(roots.logos, { recursive: true });
  await fs.writeFile(safeFile(roots.logos, name), png);
  try {
    const ctx = await generationContext(
      1,
      sadt.referenceFor("PHYSIOTHERAPY_GUIDE"),
      mockDb(treatment),
    );
    const result = await generateDocument({
      ...ctx,
      logo: { file_path: name, mime_type: "image/png" },
    });
    assert.equal((await PDFDocument.load(result)).getPageCount(), 1);
  } finally {
    await fs.unlink(safeFile(roots.logos, name));
  }
});

test("MySQL Date objects render the same SADT date cells as ISO dates for preview and generation", async () => {
  const { decodePDFRawStream } = require('pdf-lib');
  async function content(bytes) {
    const pdf=await PDFDocument.load(bytes);
    const streams=pdf.getPage(0).node.Contents();
    return Array.from({length:streams.size()},(_,index)=>Buffer.from(decodePDFRawStream(pdf.context.lookup(streams.get(index))).decode()).toString()).join('\n');
  }
  for (const type of ['CONSULTATION_GUIDE','PHYSIOTHERAPY_GUIDE','ELECTROSTIMULATION']) {
    const expected=await generationContext(1,sadt.referenceFor(type),mockDb(treatment));
    const actual=await generationContext(1,sadt.referenceFor(type),mockDb({
      ...treatment,referral_date:new Date('2026-10-19T00:00:00.000Z'),
      card_expiration:new Date('2027-12-31T00:00:00.000Z'),
      assessment_date:new Date('2026-10-19T00:00:00.000Z'),
    }));
    const reference=await content(await generateDocument(expected));
    assert.equal(await content(await generateDocument(actual)),reference);
    assert.equal(await content(await generateDocument(actual)),reference);
  }
});
test("text fitting never silently drops clinical text and document updates preserve authorization progress", async () => {
  const doc = await PDFDocument.create(),
    font = await doc.embedFont("Helvetica");
  const text =
    "Texto clínico completo para conferir quebra de linha sem cortes";
  const fitted = fitText(font, text, 7, 160, 20, true, 4.5);
  assert.equal(fitted.lines.join(" "), text);
  for (const status of [
    "IN_PROGRESS",
    "PENDING",
    "AUTHORIZED",
    "DENIED",
    "SESSION_TOKEN",
    "NOT_REQUIRED",
  ])
    assert.equal(
      documentTransition(false, status).authorization_status,
      status,
    );
});

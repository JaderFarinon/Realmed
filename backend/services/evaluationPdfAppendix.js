const { rgb } = require("pdf-lib");
const fs = require("node:fs/promises"),
  path = require("node:path");
module.exports = async function append(pdf, process, regular, bold) {
  const e = process.evaluation_details;
  let sheet, y;
  const clean = (v) => String(v ?? "").replace(/[^\x20-\x7E\xA0-\xFF\n]/g, " ");
  const next = () => {
    sheet = pdf.addPage([595.28, 841.89]);
    y = 795;
    sheet.drawText("REALMED — Avaliação digital", {
      x: 32,
      y,
      size: 13,
      font: bold,
    });
    y -= 25;
  };
  next();
  const line = (value, font = regular, size = 9) => {
    if (y < 45) next();
    sheet.drawText(clean(value), { x: 32, y, size, font });
    y -= 14;
  };
  const field = (label, value) => {
    if (value == null || value === "") return;
    if (y < 85) next();
    line(label, bold);
    for (const raw of clean(value).split("\n")) {
      let text = "";
      for (const word of raw.split(" ")) {
        if (text && regular.widthOfTextAtSize(text + " " + word, 9) > 525) {
          line(text);
          text = "";
        }
        let remaining = word;
        while (regular.widthOfTextAtSize(remaining, 9) > 525) {
          let chunk = "";
          for (const char of remaining) {
            if (regular.widthOfTextAtSize(chunk + char, 9) > 525) break;
            chunk += char;
          }
          line(chunk);
          remaining = remaining.slice(chunk.length);
        }
        text += (text ? " " : "") + remaining;
      }
      line(text);
    }
    y -= 7;
  };
  field("Paciente", process.patient_name);
  const labels = {
    referral_professional: "Profissional solicitante",
    referral_date: "Data do encaminhamento",
    medical_diagnosis: "Diagnóstico / hipótese",
    cid: "CID",
    requested_sessions: "Sessões solicitadas",
    authorization_reference: "Guia / autorização",
    chief_complaint: "Queixa principal",
    current_history: "História do quadro atual",
    functional_limitations: "Limitações funcionais",
    physical_exam: "Exame físico",
    pain_score: "Dor EVA (0–10)",
    pain_classification: "Classificação da dor",
    pain_location: "Localização predominante",
    other_region: "Outra região",
    severity_justification: "Justificativa da gravidade",
    other_precaution: "Outra precaução",
    specific_care_notes: "Cuidados específicos",
    therapeutic_goals: "Objetivos terapêuticos",
    other_conduct: "Outra conduta",
    conduct_description: "Descrição / parâmetros / progressão",
    reevaluation_date: "Previsão de reavaliação",
    reevaluation_notes: "Critério de reavaliação",
    sessions_per_week: "Frequência planejada / semana",
    planned_total_sessions: "Total previsto de sessões",
    expected_start_date: "Início previsto",
    responsible_name: "Fisioterapeuta responsável",
    responsible_crefito: "CREFITO",
    evaluation_date: "Data da avaliação",
  };
  for (const [key, label] of Object.entries(labels)) {
    const value = e[key];
    field(
      label,
      key.endsWith("_date") && value
        ? String(value).slice(0, 10).split("-").reverse().join("/")
        : value,
    );
  }
  field(
    "Gravidade",
    { MILD: "Leve", MODERATE: "Moderada", SEVERE: "Grave" }[e.severity],
  );
  field(
    "Risco assistencial",
    { LOW: "Baixo", MODERATE: "Moderado", HIGH: "Alto" }[e.care_risk],
  );
  field(
    "Acompanhamento individualizado",
    e.individual_monitoring == null
      ? "Não informado"
      : e.individual_monitoring
        ? "Sim"
        : "Não",
  );
  field(
    "Regiões e lateralidade",
    (e.regions || [])
      .map(
        (r) =>
          r.region +
          " — " +
          ({ RIGHT: "Direita", LEFT: "Esquerda", BILATERAL: "Bilateral" }[
            r.laterality
          ] || "Não se aplica / não informada"),
      )
      .join("\n"),
  );
  field("Precauções", (e.precautions || []).join("; "));
  field("Condutas", (e.conducts || []).join("; "));
  const days = {
    MONDAY: "Segunda",
    TUESDAY: "Terça",
    WEDNESDAY: "Quarta",
    THURSDAY: "Quinta",
    FRIDAY: "Sexta",
  };
  field(
    "Dias e horários",
    (e.treatment_days || [])
      .map(
        (d) =>
          days[d.day] +
          ": " +
          (d.enabled ? "Sim — " + (d.time || "Não informado") : "Não"),
      )
      .join("\n"),
  );
  next();
  line("Mapa corporal — dor, limitação e atenção", bold);
  const image = await pdf.embedPng(
      await fs.readFile(
        path.join(__dirname, "../templates/evaluation-body-map.png"),
      ),
    ),
    width = 500,
    height = (500 * 1199) / 1417,
    bottom = y - height;
  sheet.drawImage(image, { x: 32, y: bottom, width, height });
  const colors = {
    PAIN: rgb(0.85, 0.1, 0.1),
    LIMITATION: rgb(0.1, 0.3, 0.8),
    ATTENTION: rgb(217 / 255, 119 / 255, 6 / 255),
  };
  for (const p of e.body_marks || [])
    sheet.drawCircle({
      x: 32 + p.x * width,
      y: bottom + (1 - p.y) * height,
      size: 4,
      color: colors[p.kind] || rgb(0, 0, 0),
    });
  y = bottom - 20;
  line("Vermelho: dor. Azul: limitação. Laranja: atenção.");
  y -= 20;
  line("Assinatura / rubrica", bold);
  y -= 110;
  for (const stroke of e.signature_strokes || [])
    for (let i = 1; i < stroke.length; i++)
      sheet.drawLine({
        start: {
          x: 32 + stroke[i - 1].x * 525,
          y: y + (1 - stroke[i - 1].y) * 100,
        },
        end: { x: 32 + stroke[i].x * 525, y: y + (1 - stroke[i].y) * 100 },
        thickness: 1.2,
        color: rgb(0.1, 0.15, 0.2),
      });
  if (!(e.signature_strokes || []).some((s) => s.length > 1))
    line("Não registrada.");
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawRectangle({
      x: 505,
      y: 800,
      width: 75,
      height: 22,
      color: rgb(1, 1, 1),
    });
    p.drawText(`Página ${i + 1} de ${pages.length}`, {
      x: 510,
      y: 810,
      size: 7,
      font: regular,
    });
  });
};

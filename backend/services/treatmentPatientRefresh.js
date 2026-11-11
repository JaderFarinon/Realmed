const {
  syncPatientFromStenci,
} = require("../../integrations/stenci/StenciPatientSyncService");
const fail = (message, status = 422) =>
  Object.assign(new Error(message), { status });
async function refreshTreatmentPatient(
  db,
  {
    processId,
    actorId,
    fetchPatients,
    validatePatient = (value) => value,
    audit = async () => {},
    sync = syncPatientFromStenci,
  },
) {
  const treatment = await db("guide_processes")
    .where({ id: processId })
    .first();
  if (!treatment) throw fail("Tratamento não encontrado.", 404);
  const patient = await db("patients")
    .where({ id: treatment.patient_id })
    .first();
  if (!patient || patient.external_source !== "STENCI" || !patient.external_id)
    throw fail(
      "Este paciente não está vinculado ao Stenci. Confira seu cadastro em Pacientes.",
    );
  const searches = [
    ...new Set(
      [
        String(patient.cpf || "").replace(/\D/g, ""),
        String(patient.full_name || "").trim(),
      ].filter((s) => s.length >= 2),
    ),
  ];
  let external;
  for (const search of searches) {
    for (let page = 0; page < 3; page++) {
      const result = await fetchPatients({
        name: "searchPatients",
        search,
        limit: 30,
        offset: page * 30,
      });
      if (!Array.isArray(result?.items) || typeof result.hasMore !== "boolean")
        throw fail("Resposta inválida do Stenci.", 502);
      const matches = result.items.filter(
        (row) => String(row.id) === String(patient.external_id),
      );
      if (matches.length > 1)
        throw fail(
          "O Stenci retornou um cadastro ambíguo. Confira o paciente antes de atualizar.",
          409,
        );
      if (matches.length) {
        external = validatePatient(matches[0], patient.external_id);
        break;
      }
      if (!result.hasMore) break;
    }
    if (external) break;
  }
  if (!external)
    throw fail(
      "Não foi possível localizar este mesmo paciente no Stenci pelo CPF ou nome atual. Confira esses dados no cadastro de origem.",
      404,
    );
  return db.transaction(async (trx) => {
    const current = await trx("guide_processes")
      .where({ id: processId })
      .forUpdate()
      .first();
    if (!current || current.patient_id !== treatment.patient_id)
      throw fail(
        "O paciente do tratamento mudou durante a consulta. Atualize a página e tente novamente.",
        409,
      );
    require("./treatmentStages").assertOpen(current, "reception");
    const locked = await trx("patients")
      .where({ id: patient.id })
      .forUpdate()
      .first();
    if (
      !locked ||
      locked.external_source !== "STENCI" ||
      String(locked.external_id) !== String(patient.external_id)
    )
      throw fail("O vínculo do paciente foi alterado durante a consulta.", 409);
    const result = await sync(trx, external);
    if (result.created || result.patient.id !== patient.id)
      throw fail(
        "O vínculo do paciente não corresponde ao cadastro existente.",
        409,
      );
    let insurancePreserved = false;
    if (result.patient_insurance) {
      if (!current.patient_insurance_id) {
        require("./treatmentStages").assertOpen(current, "central");
        await trx("guide_processes").where({ id: processId }).update({
          patient_insurance_id: result.patient_insurance.id,
          updated_at: trx.fn.now(),
        });
      } else {
        const assigned = await trx("patient_insurances")
          .where({ id: current.patient_insurance_id })
          .first();
        insurancePreserved =
          !!assigned &&
          Number(assigned.insurance_provider_id) !==
            Number(result.patient_insurance.insurance_provider_id);
      }
    }
    await audit(trx, {
      processId,
      actorId,
      patientId: patient.id,
      insurancePreserved,
    });
    return {
      patient: result.patient,
      insurancePreserved,
      treatmentId: processId,
    };
  });
}
module.exports = { refreshTreatmentPatient };

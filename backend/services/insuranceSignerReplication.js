const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const { safeFile } = require("./documentGenerationService");
const { validateImageUpload } = require("./imageAssetService");
const { parsePlacement } = require("./insuranceSignerPlacement");
const fail = (message) => Object.assign(new Error(message), { status: 422 });
const identifier = (value) => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1)
    throw fail("Identificador de convênio ou assinatura inválido.");
  return n;
};
async function replicate(db, input, actorId, root) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw fail("Informe a origem e os destinos da assinatura.");
  const sourceId = identifier(input.source_id),
    versionId = identifier(input.source_signer_id);
  if (
    !Array.isArray(input.destination_ids) ||
    !input.destination_ids.length ||
    input.destination_ids.length > 100
  )
    throw fail("Selecione de 1 a 100 convênios de destino.");
  const destinations = [...new Set(input.destination_ids.map(identifier))];
  if (destinations.includes(sourceId))
    throw fail("A origem não pode ser um dos destinos.");
  if (
    input.overwrite_existing !== undefined &&
    typeof input.overwrite_existing !== "boolean"
  )
    throw fail("Opção de substituição inválida.");
  const created = [];
  try {
    return await db.transaction(async (trx) => {
      const owners = await trx("insurance_providers")
        .whereIn(
          "id",
          [sourceId, ...destinations].sort((a, b) => a - b),
        )
        .orderBy("id")
        .forUpdate();
      if (owners.length !== destinations.length + 1)
        throw fail("Um dos convênios não foi encontrado. Atualize a lista.");
      const signature = await trx("insurance_provider_signatures")
        .where({ insurance_provider_id: sourceId, active: true })
        .orderBy("id", "desc")
        .first();
      if (!signature)
        throw fail(
          "O convênio de origem não possui médico assinante cadastrado.",
        );
      if (signature.id !== versionId)
        throw Object.assign(
          new Error(
            "A assinatura de origem mudou. Selecione novamente a origem para conferir a versão atual.",
          ),
          { status: 409 },
        );
      const placement = parsePlacement(signature.placement);
      const image = await fs.readFile(safeFile(root, signature.file_path));
      validateImageUpload({
        buffer: image,
        mimeType: signature.mime_type,
        originalName: encodeURIComponent(signature.original_name),
        allowedMimeTypes: ["image/png"],
      });
      await fs.mkdir(root, { recursive: true });
      const results = [];
      for (const destinationId of destinations) {
        const owner = owners.find((row) => row.id === destinationId);
        const existing = await trx("insurance_provider_signatures")
          .where({ insurance_provider_id: destinationId, active: true })
          .first();
        if (existing && !input.overwrite_existing) {
          results.push({
            insurance_provider_id: destinationId,
            name: owner.name,
            status: "preserved",
          });
          continue;
        }
        const filename = crypto.randomUUID() + ".png",
          target = safeFile(root, filename);
        const handle = await fs.open(target, "wx");
        created.push(target);
        try {
          await handle.writeFile(image);
        } finally {
          await handle.close();
        }
        await trx("insurance_provider_signatures")
          .where({ insurance_provider_id: destinationId, active: true })
          .update({ active: false });
        const [signatureId] = await trx("insurance_provider_signatures").insert(
          {
            insurance_provider_id: destinationId,
            doctor_name: signature.doctor_name,
            file_path: filename,
            original_name: signature.original_name,
            mime_type: "image/png",
            file_size: image.length,
            placement: JSON.stringify(placement),
            active: true,
            created_by: actorId,
          },
        );
        results.push({
          insurance_provider_id: destinationId,
          name: owner.name,
          status: "copied",
          signature_id: signatureId,
        });
      }
      return {
        source_signer_id: signature.id,
        results,
        copied: results.filter((row) => row.status === "copied").length,
        preserved: results.filter((row) => row.status === "preserved").length,
      };
    });
  } catch (error) {
    await Promise.allSettled(created.map((file) => fs.unlink(file)));
    throw error;
  }
}
module.exports = { replicate };

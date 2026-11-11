const { BUILTIN_KEY } = require("./sadtTemplateService");
const {
  widthPt: width,
  heightPt: height,
} = require("../templates/sadt/guia-sadt.fields.json");
function parsePlacement(value) {
  if (value == null || value === "") return null;
  try {
    if (typeof value === "string") value = JSON.parse(value);
  } catch {
    throw Object.assign(new Error("Posição da assinatura inválida."), {
      status: 400,
    });
  }
  if (value == null) return null;
  const { x, y, width: w, height: h, page, templateKey } = value || {};
  if (
    templateKey !== BUILTIN_KEY ||
    page !== 1 ||
    ![x, y, w, h].every((n) => typeof n === "number" && Number.isFinite(n)) ||
    x < 0 ||
    y < 0 ||
    w < 5 ||
    h < 5 ||
    x + w > width + 0.01 ||
    y + h > height + 0.01
  )
    throw Object.assign(
      new Error("A assinatura deve ficar dentro da página da guia SADT."),
      { status: 400 },
    );
  return { templateKey, page, x, y, width: w, height: h };
}
module.exports = { parsePlacement };

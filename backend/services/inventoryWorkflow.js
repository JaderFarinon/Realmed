const fail = (message, status = 422) => {
  throw Object.assign(new Error(message), { status });
};
const integer = (value, label = "Quantidade", minimum = 1) => {
  if (
    value === "" ||
    value == null ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < minimum ||
    Number(value) > 2147483647
  )
    fail(
      `${label} deve ser um número inteiro ${minimum === 0 ? "não negativo" : "positivo"}.`,
    );
  return Number(value);
};
const normalizeCode = (value) => {
  const code = String(value || "")
    .trim()
    .toUpperCase();
  return /^\d+$/.test(code) ? code.padStart(6, "0") : code;
};
const requestStatus = (items) => {
  if (!items.length) return "PENDENTE";
  if (items.every((i) => i.status === "ATENDIDO")) return "ATENDIDO";
  if (
    items.some((i) => ["ATENDIDO", "PARCIALMENTE_ATENDIDO"].includes(i.status))
  )
    return "PARCIALMENTE_ATENDIDO";
  return items.some((i) => i.status === "AGUARDANDO_COMPRA")
    ? "AGUARDANDO_COMPRA"
    : "PENDENTE";
};
const fulfillment = (item, quantity, balance) => {
  const amount = integer(quantity);
  if (
    amount >
    Number(item.requested_quantity) - Number(item.fulfilled_quantity)
  )
    fail("Quantidade informada excede o saldo pendente do item.");
  if (Number(balance) < amount)
    return {
      ok: false,
      status: "AGUARDANDO_COMPRA",
      fulfilled_quantity: Number(item.fulfilled_quantity),
      message:
        "Saldo insuficiente no setor do solicitante. Item marcado como Aguardando compra.",
    };
  const fulfilled = Number(item.fulfilled_quantity) + amount;
  return {
    ok: true,
    status:
      fulfilled === Number(item.requested_quantity)
        ? "ATENDIDO"
        : "PARCIALMENTE_ATENDIDO",
    fulfilled_quantity: fulfilled,
    message: "Atendimento registrado com sucesso.",
  };
};
const isAdmin = (user) => ["admin", "masteradmin"].includes(user.role);
const allSectors = (user) =>
  isAdmin(user) || ["COORDINATOR", "MANAGER"].includes(user.inventory_profile);
const canRequestFor = (user, target) =>
  isAdmin(user) ||
  (user.inventory_profile === "COORDINATOR" &&
    user.sector_id != null &&
    Number(user.sector_id) === Number(target.sector_id)) ||
  Number(user.id) === Number(target.id);
module.exports = {
  fail,
  integer,
  normalizeCode,
  requestStatus,
  fulfillment,
  isAdmin,
  allSectors,
  canRequestFor,
};

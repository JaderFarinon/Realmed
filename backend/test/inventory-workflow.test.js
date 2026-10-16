const test = require("node:test");
const assert = require("node:assert/strict");
const {
  fulfillment,
  requestStatus,
  normalizeCode,
  integer,
  canRequestFor,
  allSectors,
} = require("../services/inventoryWorkflow");
const { isPublicAddress } = require("../services/inventoryPhotoService");

test("partial fulfillment preserves remaining quantity and closes only after full delivery", () => {
  const first = fulfillment(
    { requested_quantity: 10, fulfilled_quantity: 0 },
    4,
    6,
  );
  assert.equal(first.status, "PARCIALMENTE_ATENDIDO");
  assert.equal(first.fulfilled_quantity, 4);
  assert.equal(
    fulfillment({ requested_quantity: 10, fulfilled_quantity: 4 }, 6, 6).status,
    "ATENDIDO",
  );
  assert.throws(
    () =>
      fulfillment({ requested_quantity: 10, fulfilled_quantity: 4 }, 7, 100),
    /saldo pendente/,
  );
});
test("insufficient stock marks awaiting purchase without changing fulfilled quantity", () => {
  assert.deepEqual(
    fulfillment({ requested_quantity: 10, fulfilled_quantity: 3 }, 7, 6),
    {
      ok: false,
      status: "AGUARDANDO_COMPRA",
      fulfilled_quantity: 3,
      message:
        "Saldo insuficiente no setor do solicitante. Item marcado como Aguardando compra.",
    },
  );
});
test("order aggregation follows legacy precedence including empty orders", () => {
  assert.equal(requestStatus([]), "PENDENTE");
  assert.equal(
    requestStatus([{ status: "ATENDIDO" }, { status: "ATENDIDO" }]),
    "ATENDIDO",
  );
  assert.equal(
    requestStatus([{ status: "ATENDIDO" }, { status: "AGUARDANDO_COMPRA" }]),
    "PARCIALMENTE_ATENDIDO",
  );
  assert.equal(
    requestStatus([{ status: "PENDENTE" }, { status: "AGUARDANDO_COMPRA" }]),
    "AGUARDANDO_COMPRA",
  );
});
test("product codes and quantities retain legacy formatting without accepting invalid values", () => {
  assert.equal(normalizeCode(" 42 "), "000042");
  assert.equal(normalizeCode("abc-7"), "ABC-7");
  assert.equal(integer(0, "Saldo", 0), 0);
  for (const value of [-1, 1.5, "", null, "abc", 2147483648])
    assert.throws(() => integer(value));
});
test("coordinator requester scope differs from manager stock visibility", () => {
  const coordinator = {
    id: 1,
    role: "user",
    inventory_profile: "COORDINATOR",
    sector_id: 2,
  };
  assert.equal(canRequestFor(coordinator, { id: 3, sector_id: 2 }), true);
  assert.equal(canRequestFor(coordinator, { id: 3, sector_id: 4 }), false);
  assert.equal(allSectors(coordinator), true);
  assert.equal(
    canRequestFor(
      { ...coordinator, inventory_profile: "MANAGER" },
      { id: 3, sector_id: 2 },
    ),
    false,
  );
  assert.equal(
    canRequestFor(
      { ...coordinator, inventory_profile: "USER" },
      { id: 1, sector_id: 2 },
    ),
    true,
  );
});
test("photo URLs cannot access internal IPv4 or IPv6 networks", () => {
  for (const ip of [
    "127.0.0.1",
    "10.100.67.92",
    "192.168.0.1",
    "172.17.0.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "::ffff:127.0.0.1",
    "fe80::1",
    "fd00::1",
    "2001:db8::1",
  ])
    assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});

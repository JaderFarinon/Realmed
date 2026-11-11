const test = require("node:test"),
  assert = require("node:assert/strict");
const { parsePlacement } = require("../services/insuranceSignerPlacement");
const p = {
  templateKey: "SADT_STANDARD_V1",
  page: 1,
  x: 600,
  y: 530,
  width: 150,
  height: 40,
};
test("signer placement validates model, coordinates and page bounds without coercion", () => {
  assert.equal(parsePlacement(null), null);
  assert.equal(parsePlacement("null"), null);
  assert.deepEqual(parsePlacement(JSON.stringify(p)), p);
  for (const invalid of [
    { ...p, x: -1 },
    { ...p, y: 590 },
    { ...p, page: 2 },
    { ...p, width: Infinity },
    { ...p, x: "600" },
    { ...p, templateKey: "OTHER" },
    { ...p, width: 0 },
  ])
    assert.throws(() => parsePlacement(invalid), { status: 400 });
});

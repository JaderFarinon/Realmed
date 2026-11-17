const text = (value) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : null;
function demographics(patient = {}) {
  const address = Array.isArray(patient.addresses)
    ? patient.addresses[0]
    : null;
  const birth =
    typeof patient.birthDate === "string"
      ? patient.birthDate.slice(0, 10)
      : null;
  const birthDate =
    birth &&
    /^\d{4}-\d{2}-\d{2}$/.test(birth) &&
    Number.isFinite(Date.parse(birth)) &&
    new Date(birth).toISOString().slice(0, 10) === birth
      ? birth
      : null;
  return Object.fromEntries(
    Object.entries({
      birth_date: birthDate,
      gender: text(patient.gender),
      city: text(address?.city),
      neighborhood: text(address?.neighborhood),
      state: text(address?.state),
    }).filter(([, value]) => value != null),
  );
}
module.exports = { demographics };

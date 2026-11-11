const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const directory = () =>
  process.env.REALMED_BILLING_CREDENTIAL_DIR ||
  "/qyvia/realmed/shared/secrets/billing-stenci";
function readCredentials(dir = directory()) {
  const key = fs.readFileSync(path.join(dir, "key.bin"));
  try {
    const envelope = JSON.parse(
      fs.readFileSync(path.join(dir, "credentials.json"), "utf8"),
    );
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAAD(Buffer.from("realmed-stenci-billing-v1"));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(envelope.data, "base64")),
      decipher.final(),
    ]);
    try {
      return JSON.parse(plain.toString("utf8"));
    } finally {
      plain.fill(0);
    }
  } finally {
    key.fill(0);
  }
}
function configured(dir = directory()) {
  return (
    fs.existsSync(path.join(dir, "key.bin")) &&
    fs.existsSync(path.join(dir, "credentials.json"))
  );
}
function writeCredentials(credentials, dir = directory()) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
  const keyPath = path.join(dir, "key.bin");
  if (!fs.existsSync(keyPath))
    fs.writeFileSync(keyPath, crypto.randomBytes(32), {
      mode: 0o600,
      flag: "wx",
    });
  fs.chmodSync(keyPath, 0o600);
  const key = fs.readFileSync(keyPath),
    iv = crypto.randomBytes(12),
    plain = Buffer.from(JSON.stringify(credentials));
  try {
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from("realmed-stenci-billing-v1"));
    const data = Buffer.concat([cipher.update(plain), cipher.final()]);
    const target = path.join(dir, "credentials.json"),
      temporary = path.join(dir, `credentials-${crypto.randomUUID()}.tmp`);
    fs.writeFileSync(
      temporary,
      JSON.stringify({
        version: 1,
        iv: iv.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
        data: data.toString("base64"),
      }),
      { mode: 0o600, flag: "wx" },
    );
    fs.renameSync(temporary, target);
    fs.chmodSync(target, 0o600);
  } finally {
    plain.fill(0);
    key.fill(0);
  }
}
module.exports = { directory, configured, readCredentials, writeCredentials };

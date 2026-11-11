// Run on the Realmed host. Secret arrives on stdin over SSH, never in arguments or a plaintext file.
const path = require("node:path"),
  crypto = require("node:crypto");
const backend = process.cwd();
require(path.join(backend, "node_modules/dotenv")).config({
  path: "/qyvia/realmed/shared/backend.env",
});
const StenciClient = require(
  path.join(path.dirname(backend), "integrations/stenci/StenciClient"),
);
const StenciService = require(
  path.join(path.dirname(backend), "integrations/stenci/StenciService"),
);
const { getStenciConfig } = require(
  path.join(path.dirname(backend), "integrations/stenci/config"),
);
const { withTransientStenci } = require(
  path.join(backend, "services/transientStenciService"),
);
async function main() {
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += chunk;
    if (raw.length > 10000) throw Error("INPUT_TOO_LARGE");
  }
  const credentials = JSON.parse(raw);
  raw = "";
  if (
    typeof credentials.username !== "string" ||
    !credentials.username.trim() ||
    credentials.username.length > 300 ||
    typeof credentials.password !== "string" ||
    !credentials.password ||
    credentials.password.length > 4096
  )
    throw Error("INPUT_INVALID");
  const config = getStenciConfig(),
    service = new StenciService(
      new StenciClient({
        config,
        deadlineAt: Date.now() + 35000,
        logger: { info() {}, warn() {}, error() {} },
      }),
    );
  try {
    const identity = await withTransientStenci(service, async () => {
      const identity = await service.authenticateUser(
        credentials.username.trim(),
        credentials.password,
        crypto.randomUUID().replace(/-/g, ""),
      );
      const schedules = await service.billingRead({ kind: "schedules" });
      if (!schedules.items.length || schedules.hasMore)
        throw Error("SCHEDULES_INCOMPLETE");
      await service.billingRead({
        kind: "calendar",
        date: require(
          path.join(backend, "services/billingAgendaCollection"),
        ).localToday(),
        scheduleId: schedules.items[0].id,
      });
      return identity;
    });
    const { writeCredentials } = require(
      path.join(backend, "services/billingCollectorCredentials"),
    );
    writeCredentials({
      username: credentials.username.trim(),
      password: credentials.password,
      stenciUserId: identity.stenci_user_id,
      branchId: config.branchId,
    });
    console.log("COLLECTOR_CREDENTIALS_CONFIGURED");
  } finally {
    credentials.password = "";
    credentials.username = "";
  }
}
main().catch((error) => {
  console.error(
    "COLLECTOR_SETUP_FAILED",
    /^[A-Z0-9_]+$/.test(error.code || "") ? error.code : "SETUP_FAILED",
  );
  process.exitCode = 1;
});

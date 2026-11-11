const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  dotenv = require("../backend/node_modules/dotenv"),
  mysql = require("../backend/node_modules/mysql2/promise"),
  knexFactory = require("../backend/node_modules/knex");
const {
  enqueueRange,
  collectDay,
  agendaSummary,
} = require("../backend/services/billingAgendaCollection");
(async () => {
  const env = dotenv.parse(fs.readFileSync(path.join(root, "backend/.env"))),
    config = {
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      user: env.DB_USER,
      password: env.DB_PASS,
    };
  const admin = await mysql.createConnection(config),
    name = "realmed_bill_verify_" + crypto.randomBytes(8).toString("hex");
  let db,
    created = false;
  try {
    await admin.query("CREATE DATABASE ??", [name]);
    created = true;
    db = knexFactory({
      client: "mysql2",
      connection: { ...config, database: name },
    });
    await require("../backend/migrations/20261020000006_billing_agenda_collection").up(
      db,
    );
    await db('billing_collection_days').insert({branch_id:'migration-sentinel',service_date:'2026-01-01',requested_at:new Date(),status:'COMPLETE',last_success_at:new Date()});
    await require('../backend/migrations/20261020000007_billing_agenda_filters').up(db);
    const migrated=await db('billing_collection_days').where({branch_id:'migration-sentinel'}).first();
    assert.equal(migrated.status,'QUEUED');
    assert.ok(migrated.last_success_at,'metadata refresh preserves last successful snapshot');
    await db('billing_collection_days').where({branch_id:'migration-sentinel'}).delete();
    const branchId = "b",
      date = "2026-10-19",
      schedule = { id: "a".repeat(24), name: "Avaliação" };
    await enqueueRange(db, branchId, date, "2026-10-20");
    const appt = {
      id: "id1",
      patient_id: "p",
      patient_name: "Paciente fictício",
      startDate: date + "T12:00:00Z",
      status: "finished",
      expenses: [{ code: "50000160", type: "session" }],
    };
    let rows = [appt],
      fail = false;
    const readBatch = async (ops) =>
      ops.map((op) => {
        if (op.kind === "schedules")
          return {
            items: [schedule, { id: "b".repeat(24), name: "Fisioterapia" }],
          };
        if (fail)
          throw Object.assign(new Error("simulated logout failure"), {
            code: "STENCI_LOGOUT_FAILED",
          });
        return { items: rows };
      });
    await collectDay({ db, branchId, date, readBatch });
    await collectDay({ db, branchId, date, readBatch });
    assert.equal(
      Number(
        (await db("billing_stenci_appointments").count("* as n").first()).n,
      ),
      1,
    );
    fail = true;
    await assert.rejects(collectDay({ db, branchId, date, readBatch }));
    assert.equal(
      Number(
        (await db("billing_stenci_appointments").count("* as n").first()).n,
      ),
      1,
    );
    const failed = await db("billing_collection_days")
      .where({ service_date: date })
      .first();
    assert.equal(failed.status, "FAILED");
    assert.ok(failed.last_success_at);
    fail = false;
    rows = [];
    await collectDay({ db, branchId, date, readBatch });
    assert.equal(
      Number(
        (await db("billing_stenci_appointments").count("* as n").first()).n,
      ),
      0,
    );
    rows = [{ ...appt, status: "missed" }];
    await collectDay({ db, branchId, date, readBatch });
    const result = agendaSummary(
      await db("billing_stenci_appointments"),
      await db("billing_collection_days"),
      date,
      "2026-10-20",
    );
    assert.equal(result.totals.missed, 1);
    assert.equal(result.coverage.pendingDays, 1);
    rows = [{ ...appt, status: "finished" }];
    await enqueueRange(db, "other", date, date);
    await collectDay({ db, branchId: "other", date, readBatch });
    assert.equal(
      Number(
        (await db("billing_stenci_appointments").count("* as n").first()).n,
      ),
      2,
    );
    const {tick,state}=require('../backend/services/billingCollectorWorker');
    let reads=0;
    const workerRead=async ops=>{reads++;return ops.map(op=>op.kind==='schedules'?{items:[schedule]}:{items:[{...appt,startDate:op.date+'T12:00:00Z'}]})};
    const options={branchId,enabled:true,isConfigured:()=>true,readBatch:workerRead,now:new Date('2026-10-20T15:00:00Z'),maxDays:1};
    const lock='rm_bill_'+crypto.createHash('sha256').update(branchId).digest('hex').slice(0,24);
    await admin.query('SELECT GET_LOCK(?,0)',[lock]);
    try{await tick(db,options);assert.equal(reads,0,'another worker owns this branch')}finally{await admin.query('SELECT RELEASE_LOCK(?)',[lock])}
    await tick(db,options);assert.ok(reads>0);assert.equal((await db('billing_collection_days').where({branch_id:branchId,service_date:'2026-10-20'}).first()).status,'COMPLETE');assert.equal(state.running,false);
    await db('billing_collection_days').where({branch_id:branchId,service_date:date}).update({status:'RUNNING'});
    await tick(db,options);assert.equal((await db('billing_collection_days').where({branch_id:branchId,service_date:date}).first()).status,'COMPLETE','interrupted job recovers under the lock');
    // A fresh installation has no oldest day yet: it must bootstrap a valid month range.
    await tick(db,{...options,branchId:'fresh-install',maxDays:1});
    assert.equal(state.lastError,null);
    const freshDays=await db('billing_collection_days').where({branch_id:'fresh-install'}).orderBy('service_date');
    assert.equal(freshDays.length,20);
    assert.equal(String(freshDays[0].service_date instanceof Date?freshDays[0].service_date.toISOString().slice(0,10):freshDays[0].service_date),'2026-10-01');
    assert.equal(freshDays.at(-1).status,'COMPLETE');
    console.log(
      "PASS MySQL collection: migration, upsert/deduplication, failed logout preserves day, removed appointments, status refresh and branch isolation.",
    );
  } finally {
    if (db) await db.destroy();
    if (created && /^realmed_bill_verify_[a-f0-9]{16}$/.test(name))
      await admin.query("DROP DATABASE ??", [name]);
    await admin.end();
  }
})().catch((error) => {
  console.error(error.code || error.message);
  process.exitCode = 1;
});

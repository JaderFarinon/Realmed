exports.up = async db => {
  await db.schema.createTable('events', t => {
    t.increments('id');
    t.string('slug',80).notNullable().unique();
    t.string('name',180).notNullable();
    t.date('event_date').notNullable();
    t.string('event_time',5).notNullable();
    t.string('location_name',180).notNullable();
    t.string('address',255).notNullable();
    t.string('confirmation_path',180).notNullable();
    t.timestamp('created_at').notNullable().defaultTo(db.fn.now());
  });
  await db('events').insert({slug:'realmed-2026',name:'Confraternização 2026',event_date:'2026-12-10',event_time:'19:30',location_name:'Pizzaria La Piazza',address:'R. Chile, 2258 — Rebouças',confirmation_path:'/confraternizacao'});
};
exports.down = async () => {}; // Keep events and existing attendance on code rollback.

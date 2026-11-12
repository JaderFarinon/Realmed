exports.up = async db => {
  if (!await db.schema.hasTable('system_notifications')) await db.schema.createTable('system_notifications', t => {
    t.increments('id'); t.string('type',80).notNullable(); t.string('audience',32).notNullable().defaultTo('ADMIN');
    t.string('title',180).notNullable(); t.string('message',1000).notNullable(); t.integer('actor_user_id').unsigned().nullable();
    t.timestamp('created_at').notNullable().defaultTo(db.fn.now()); t.index(['audience','id']);
  });
  if (!await db.schema.hasTable('system_notification_reads')) await db.schema.createTable('system_notification_reads', t => {
    t.integer('notification_id').unsigned().notNullable().references('id').inTable('system_notifications').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable(); t.timestamp('read_at').notNullable().defaultTo(db.fn.now());
    t.primary(['notification_id','user_id']);
  });
};
exports.down = async () => {}; // Preserve the notification history on code rollback.

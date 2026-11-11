exports.up = async function (db) {
  for (const table of ["inventory_consumptions", "inventory_purchase_orders"]) {
    await db.schema.createTable(table, (t) => {
      t.increments("id");
      t.integer("sector_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("inventory_sectors");
      t.integer("created_by")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("users");
      t.string("request_key", 36).notNullable();
      t.string("request_hash", 64).notNullable();
      t.text("notes").nullable();
      t.timestamps(true, true);
      t.unique(
        ["created_by", "request_key"],
        table === "inventory_consumptions" ? "ic_actor_key" : "ipo_actor_key",
      );
      if (table === "inventory_purchase_orders") {
        t.string("source", 20).notNullable().defaultTo("MANUAL");
        t.string("status", 20).notNullable().defaultTo("DRAFT");
        t.integer("revision").unsigned().notNullable().defaultTo(0);
      }
    });
  }
  for (const [table, parent, foreign] of [
    ["inventory_consumption_items", "inventory_consumptions", "consumption_id"],
    [
      "inventory_purchase_order_items",
      "inventory_purchase_orders",
      "purchase_order_id",
    ],
  ]) {
    await db.schema.createTable(table, (t) => {
      t.increments("id");
      t.integer(foreign)
        .unsigned()
        .notNullable()
        .references("id")
        .inTable(parent);
      t.integer("product_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("inventory_products");
      t.integer("quantity").unsigned().notNullable();
      if (foreign === "purchase_order_id") {
        t.integer("balance_snapshot").unsigned().nullable();
        t.integer("minimum_snapshot").unsigned().nullable();
      }
      t.unique(
        [foreign, "product_id"],
        foreign === "consumption_id" ? "ici_product" : "ipoi_product",
      );
    });
  }
  await db.schema.alterTable("inventory_movements", (t) => {
    t.integer("consumption_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("inventory_consumptions");
  });
};
exports.down = async function (db) {
  await db.schema.alterTable("inventory_movements", (t) => {
    t.dropForeign("consumption_id");
    t.dropColumn("consumption_id");
  });
  for (const table of [
    "inventory_consumption_items",
    "inventory_purchase_order_items",
    "inventory_consumptions",
    "inventory_purchase_orders",
  ])
    await db.schema.dropTableIfExists(table);
};

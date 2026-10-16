exports.up = async function (knex) {
  await knex.schema.createTable("permission_audit", (t) => {
    t.increments("id");
    t.integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users");
    t.integer("changed_by")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users");
    t.json("previous_permissions").nullable();
    t.json("new_permissions").notNullable();
    t.json("context").nullable();
    t.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
  });
  for (const name of ["sectors", "categories", "presentations"]) {
    await knex.schema.createTable(`inventory_${name}`, (t) => {
      t.increments("id");
      t.string("name", 150).notNullable();
      t.text("description").nullable();
      t.boolean("active").notNullable().defaultTo(true);
      t.timestamps(true, true);
      t.unique("name");
    });
  }
  await knex("inventory_sectors").insert({
    name: "Geral",
    description: "Setor padrão de recebimento",
  });
  await knex.schema.createTable("inventory_suppliers", (t) => {
    t.increments("id");
    t.string("name", 150).notNullable();
    t.string("cnpj", 20).nullable();
    t.string("phone", 30).nullable();
    t.string("email", 150).nullable();
    t.string("contact_name", 150).nullable();
    t.boolean("active").notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.schema.createTable("inventory_user_profiles", (t) => {
    t.integer("user_id")
      .unsigned()
      .primary()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    t.integer("sector_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("inventory_sectors");
    t.enu("profile", ["USER", "COORDINATOR", "MANAGER"])
      .notNullable()
      .defaultTo("USER");
    t.timestamps(true, true);
  });
  await knex.schema.createTable("inventory_sequences", (t) => {
    t.string("name", 40).primary();
    t.integer("value").unsigned().notNullable().defaultTo(0);
  });
  await knex("inventory_sequences").insert({ name: "product_code", value: 0 });
  await knex.schema.createTable("inventory_products", (t) => {
    t.increments("id");
    t.string("code", 40).notNullable().unique();
    t.string("name", 150).notNullable();
    t.integer("category_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_categories");
    t.integer("presentation_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_presentations");
    t.integer("minimum_quantity").unsigned().notNullable().defaultTo(0);
    t.string("photo_path", 255).nullable();
    t.boolean("active").notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.schema.createTable("inventory_balances", (t) => {
    t.increments("id");
    t.integer("product_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_products");
    t.integer("sector_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_sectors");
    t.integer("quantity").unsigned().notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.unique(["product_id", "sector_id"], "uk_inventory_balance");
  });
  await knex.schema.createTable("inventory_invoices", (t) => {
    t.increments("id");
    t.string("number", 80).notNullable();
    t.integer("supplier_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_suppliers");
    t.integer("sector_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_sectors");
    t.date("invoice_date").notNullable();
    t.text("notes").nullable();
    t.boolean("closed").notNullable().defaultTo(false);
    t.integer("created_by")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users");
    t.timestamps(true, true);
  });
  await knex.schema.createTable("inventory_invoice_items", (t) => {
    t.increments("id");
    t.integer("invoice_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_invoices");
    t.integer("product_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_products");
    t.integer("quantity").unsigned().notNullable();
    t.decimal("unit_price", 12, 2).notNullable();
    t.timestamps(true, true);
  });
  await knex.schema.createTable("inventory_requests", (t) => {
    t.increments("id");
    t.integer("requester_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users");
    t.integer("sector_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_sectors");
    t.date("request_date").notNullable();
    t.text("notes").nullable();
    t.string("status", 30).notNullable().defaultTo("PENDENTE");
    t.integer("created_by")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users");
    t.timestamps(true, true);
  });
  await knex.schema.createTable("inventory_request_items", (t) => {
    t.increments("id");
    t.integer("request_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_requests")
      .onDelete("CASCADE");
    t.integer("product_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_products");
    t.integer("requested_quantity").unsigned().notNullable();
    t.integer("fulfilled_quantity").unsigned().notNullable().defaultTo(0);
    t.string("status", 30).notNullable().defaultTo("PENDENTE");
    t.text("notes").nullable();
    t.timestamps(true, true);
  });
  await knex.schema.createTable("inventory_movements", (t) => {
    t.increments("id");
    t.integer("product_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_products");
    t.integer("sector_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("inventory_sectors");
    t.integer("delta").notNullable();
    t.integer("balance_after").unsigned().notNullable();
    t.string("kind", 30).notNullable();
    t.integer("invoice_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("inventory_invoices");
    t.integer("request_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("inventory_requests");
    t.text("notes").nullable();
    t.integer("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users");
    t.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
    t.index(["sector_id", "created_at"]);
  });
};
exports.down = async function (knex) {
  for (const name of [
    "movements",
    "request_items",
    "requests",
    "invoice_items",
    "invoices",
    "balances",
    "products",
    "sequences",
    "user_profiles",
    "suppliers",
    "presentations",
    "categories",
    "sectors",
  ])
    await knex.schema.dropTableIfExists(`inventory_${name}`);
  await knex.schema.dropTableIfExists("permission_audit");
};

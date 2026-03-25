import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  public async up() {
    // Create the extension required for % operator
    await this.db.rawQuery('CREATE EXTENSION IF NOT EXISTS pg_trgm;')

    // Add full-text search index
    await this.db.rawQuery(`
      CREATE INDEX products_search_idx ON products 
      USING GIN (
        to_tsvector('english', 
          name || ' ' || 
          COALESCE(description, '') || ' ' || 
          target_problems
        )
      );
    `)

    // Add trigram indexes
    await this.db.rawQuery(`
      CREATE INDEX products_name_trgm_idx ON products 
      USING GIN (name gin_trgm_ops);
    `)

    await this.db.rawQuery(`
      CREATE INDEX products_problems_trgm_idx ON products 
      USING GIN (target_problems gin_trgm_ops);
    `)

    await this.db.rawQuery(`
      CREATE INDEX products_active_ingredient_trgm_idx ON products 
      USING GIN (active_ingredient gin_trgm_ops);
    `)
  }

  // No reversal
  public async down() {}
}

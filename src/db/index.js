const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  const client = await pool.connect();
  try {
   
// Users table (mirrors Firebase, stores extra data)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(128) UNIQUE NOT NULL,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'student',
        avatar TEXT,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Listings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS listings (
        id SERIAL PRIMARY KEY,
        owner_uid VARCHAR(128) NOT NULL,
        owner_name VARCHAR(255),
        owner_phone VARCHAR(20),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        location VARCHAR(500) NOT NULL,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        rent INTEGER NOT NULL,
        type VARCHAR(50),
        for_gender VARCHAR(50),
        furnished VARCHAR(50),
        distance_from_college VARCHAR(100),
        amenities TEXT[],
        images TEXT[],
        verified BOOLEAN DEFAULT false,
        available BOOLEAN DEFAULT true,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Saved listings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_listings (
        id SERIAL PRIMARY KEY,
        user_uid VARCHAR(128) NOT NULL,
        listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
        saved_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_uid, listing_id)
      );
    `);

    // Messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
        sender_uid VARCHAR(128) NOT NULL,
        receiver_uid VARCHAR(128) NOT NULL,
        text TEXT NOT NULL,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
        user_uid VARCHAR(128) NOT NULL,
        owner_uid VARCHAR(128) NOT NULL,
        last_message TEXT,
        last_message_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(listing_id, user_uid, owner_uid)
      );
    `);

    // Indexes for fast queries
    await client.query(`CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_listings_rent ON listings(rent);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_uid);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_listing ON messages(listing_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_listings(user_uid);`);

    console.log("✅ Database tables ready");
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };

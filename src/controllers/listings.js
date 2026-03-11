const { pool } = require("../db");

// GET /listings - fetch with filters
async function getListings(req, res) {
  try {
    const {
      city, type, for: forGender, min_rent, max_rent,
      furnished, search, available, page = 1, limit = 20,
      sort = "newest"
    } = req.query;

    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let i = 1;

    if (city && city !== "All") {
      conditions.push(`LOWER(city) = LOWER($${i++})`);
      params.push(city);
    }
    if (type && type !== "All") {
      conditions.push(`type = $${i++}`);
      params.push(type);
    }
    if (forGender && forGender !== "All") {
      conditions.push(`for_gender = $${i++}`);
      params.push(forGender);
    }
    if (furnished && furnished !== "All") {
      conditions.push(`furnished = $${i++}`);
      params.push(furnished);
    }
    if (min_rent) {
      conditions.push(`rent >= $${i++}`);
      params.push(parseInt(min_rent));
    }
    if (max_rent) {
      conditions.push(`rent <= $${i++}`);
      params.push(parseInt(max_rent));
    }
    if (available !== undefined) {
      conditions.push(`available = $${i++}`);
      params.push(available === "true");
    }
    if (search) {
      conditions.push(`(LOWER(title) LIKE $${i} OR LOWER(location) LIKE $${i} OR LOWER(city) LIKE $${i})`);
      params.push(`%${search.toLowerCase()}%`);
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy = sort === "price_asc" ? "rent ASC"
      : sort === "price_desc" ? "rent DESC"
      : sort === "popular" ? "views DESC"
      : "created_at DESC";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM listings ${where}`, params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM listings ${where} ORDER BY ${orderBy} LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      listings: result.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
}

// GET /listings/:id
async function getListing(req, res) {
  try {
    const { id } = req.params;
    // Increment views
    await pool.query(`UPDATE listings SET views = views + 1 WHERE id = $1`, [id]);
    const result = await pool.query(`SELECT * FROM listings WHERE id = $1`, [id]);
    if (!result.rows.length) return res.status(404).json({ error: "Listing not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch listing" });
  }
}

// POST /listings - create
async function createListing(req, res) {
  try {
    const {
      title, description, location, city, state, pincode,
      latitude, longitude, rent, type, for: forGender,
      furnished, distance_from_college, amenities, images
    } = req.body;

    if (!title || !location || !rent) {
      return res.status(400).json({ error: "Title, location and rent are required" });
    }

    const result = await pool.query(`
      INSERT INTO listings (
        owner_uid, owner_name, owner_phone, title, description,
        location, city, state, pincode, latitude, longitude,
        rent, type, for_gender, furnished, distance_from_college,
        amenities, images
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *
    `, [
      req.user.uid,
      req.user.name || req.body.owner_name || "",
      req.body.owner_phone || "",
      title, description, location, city, state, pincode,
      latitude, longitude, rent, type, forGender, furnished,
      distance_from_college,
      amenities || [],
      images || []
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create listing" });
  }
}

// PUT /listings/:id - update
async function updateListing(req, res) {
  try {
    const { id } = req.params;
    const listing = await pool.query(`SELECT * FROM listings WHERE id = $1`, [id]);
    if (!listing.rows.length) return res.status(404).json({ error: "Not found" });
    if (listing.rows[0].owner_uid !== req.user.uid) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const {
      title, description, location, city, state, pincode,
      rent, type, for: forGender, furnished,
      distance_from_college, amenities, available
    } = req.body;

    const result = await pool.query(`
      UPDATE listings SET
        title=$1, description=$2, location=$3, city=$4, state=$5,
        pincode=$6, rent=$7, type=$8, for_gender=$9, furnished=$10,
        distance_from_college=$11, amenities=$12, available=$13,
        updated_at=NOW()
      WHERE id=$14 RETURNING *
    `, [
      title, description, location, city, state, pincode,
      rent, type, forGender, furnished, distance_from_college,
      amenities, available, id
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update listing" });
  }
}

// DELETE /listings/:id
async function deleteListing(req, res) {
  try {
    const { id } = req.params;
    const listing = await pool.query(`SELECT * FROM listings WHERE id = $1`, [id]);
    if (!listing.rows.length) return res.status(404).json({ error: "Not found" });
    if (listing.rows[0].owner_uid !== req.user.uid) {
      return res.status(403).json({ error: "Not authorized" });
    }
    await pool.query(`DELETE FROM listings WHERE id = $1`, [id]);
    res.json({ message: "Listing deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete listing" });
  }
}

// GET /listings/my - owner's listings
async function getMyListings(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM listings WHERE owner_uid = $1 ORDER BY created_at DESC`,
      [req.user.uid]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your listings" });
  }
}

module.exports = { getListings, getListing, createListing, updateListing, deleteListing, getMyListings };

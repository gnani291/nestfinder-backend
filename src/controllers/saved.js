const { pool } = require("../db");
// POST /saved/:listingId - save a listing
async function saveListing(req, res) {
  try {
    await pool.query(
      `INSERT INTO saved_listings (user_uid, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.user.uid, req.params.listingId]
    );
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save listing" });
  }
}

// DELETE /saved/:listingId - unsave
async function unsaveListing(req, res) {
  try {
    await pool.query(
      `DELETE FROM saved_listings WHERE user_uid = $1 AND listing_id = $2`,
      [req.user.uid, req.params.listingId]
    );
    res.json({ saved: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to unsave listing" });
  }
}

// GET /saved - get all saved listings
async function getSaved(req, res) {
  try {
    const result = await pool.query(`
      SELECT l.* FROM listings l
      JOIN saved_listings s ON l.id = s.listing_id
      WHERE s.user_uid = $1
      ORDER BY s.saved_at DESC
    `, [req.user.uid]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch saved listings" });
  }
}
module.exports = { saveListing, unsaveListing, getSaved };

const { pool } = require("../db");

// GET /chat/conversations - get all conversations for user
async function getConversations(req, res) {
  try {
    const result = await pool.query(`
      SELECT c.*, l.title as listing_title, l.images as listing_images,
             l.rent as listing_rent, l.city as listing_city
      FROM conversations c
      JOIN listings l ON c.listing_id = l.id
      WHERE c.user_uid = $1 OR c.owner_uid = $1
      ORDER BY c.last_message_at DESC
    `, [req.user.uid]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
}

// GET /chat/:listingId/:otherUid - get messages in a conversation
async function getMessages(req, res) {
  try {
    const { listingId, otherUid } = req.params;
    const myUid = req.user.uid;

    // Mark messages as read
    await pool.query(`
      UPDATE messages SET read = true
      WHERE listing_id = $1 AND sender_uid = $2 AND receiver_uid = $3
    `, [listingId, otherUid, myUid]);

    const result = await pool.query(`
      SELECT * FROM messages
      WHERE listing_id = $1
        AND ((sender_uid = $2 AND receiver_uid = $3)
          OR (sender_uid = $3 AND receiver_uid = $2))
      ORDER BY created_at ASC
    `, [listingId, myUid, otherUid]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
}

// POST /chat/:listingId/:receiverUid - send message
async function sendMessage(req, res) {
  try {
    const { listingId, receiverUid } = req.params;
    const { text } = req.body;
    const senderUid = req.user.uid;

    if (!text?.trim()) return res.status(400).json({ error: "Message cannot be empty" });

    // Insert message
    const msgResult = await pool.query(`
      INSERT INTO messages (listing_id, sender_uid, receiver_uid, text)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [listingId, senderUid, receiverUid, text.trim()]);

    // Upsert conversation
    const listing = await pool.query(`SELECT owner_uid FROM listings WHERE id = $1`, [listingId]);
    if (listing.rows.length) {
      const ownerUid = listing.rows[0].owner_uid;
      const userUid = senderUid === ownerUid ? receiverUid : senderUid;
      await pool.query(`
        INSERT INTO conversations (listing_id, user_uid, owner_uid, last_message, last_message_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (listing_id, user_uid, owner_uid)
        DO UPDATE SET last_message = $4, last_message_at = NOW()
      `, [listingId, userUid, ownerUid, text.trim()]);
    }

    res.status(201).json(msgResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
}

// GET /chat/unread - count unread messages
async function getUnreadCount(req, res) {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) FROM messages
      WHERE receiver_uid = $1 AND read = false
    `, [req.user.uid]);
    res.json({ unread: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: "Failed to get unread count" });
  }
}

module.exports = { getConversations, getMessages, sendMessage, getUnreadCount };

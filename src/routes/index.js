const express = require("express");
const router = express.Router();
const { authenticate, optionalAuth } = require("../middleware/auth");
const listings = require("../controllers/listings");
const saved = require("../controllers/saved");
const chat = require("../controllers/chat");


// ── Listings ──────────────────────────────────────────
router.get("/listings",          optionalAuth, listings.getListings);
router.get("/listings/my",       authenticate, listings.getMyListings);
router.get("/listings/:id",      optionalAuth, listings.getListing);
router.post("/listings",         authenticate, listings.createListing);
router.put("/listings/:id",      authenticate, listings.updateListing);
router.delete("/listings/:id",   authenticate, listings.deleteListing);

// ── Saved ─────────────────────────────────────────────
router.get("/saved",                    authenticate, saved.getSaved);
router.post("/saved/:listingId",        authenticate, saved.saveListing);
router.delete("/saved/:listingId",      authenticate, saved.unsaveListing);

// ── Chat ──────────────────────────────────────────────
router.get("/chat/conversations",               authenticate, chat.getConversations);
router.get("/chat/unread",                      authenticate, chat.getUnreadCount);
router.get("/chat/:listingId/:otherUid",        authenticate, chat.getMessages);
router.post("/chat/:listingId/:receiverUid",    authenticate, chat.sendMessage);

// ── Health check ──────────────────────────────────────
router.get("/health", (req, res) => res.json({
  status: "ok",
  project: "NestFinder API",
  time: new Date().toISOString()
}));

module.exports = router;

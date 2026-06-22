require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { initDB } = require("./db");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 5000;


// ── Security ──────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://nestfinder-59d68.web.app",
    /\.vercel\.app$/,
    /\.netlify\.app$/,
  ],
  credentials: true,
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: { error: "Too many requests, please try again later." }
}));

// ── Middleware ────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────
app.use("/api", routes);

// Root
app.get("/", (req, res) => res.json({
  message: "🏠 NestFinder API is running!",
  version: "1.0.0",
  endpoints: {
    health:      "GET  /api/health",
    listings:    "GET  /api/listings",
    createListing: "POST /api/listings",
    saved:       "GET  /api/saved",
    chat:        "GET  /api/chat/conversations",
  }
}));

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────
async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`🚀 NestFinder API running on port ${PORT}`);
      console.log(`📦 Database connected`);
    });
  } catch (err) {
    console.error("❌ Failed to start:", err);
    process.exit(1);
  }
}

start();

const admin = require("firebase-admin");


// Initialize Firebase Admin (no service account needed - uses project ID)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

// Middleware: verify Firebase token
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Middleware: optional auth (doesn't block if no token)
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    req.user = await admin.auth().verifyIdToken(token);
  } catch {
    req.user = null;
  }
  next();
}

module.exports = { authenticate, optionalAuth };

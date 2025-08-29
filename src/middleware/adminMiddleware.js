// src/middleware/adminMiddleware.js
export const adminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (!req.user.isAdmin) return res.status(403).json({ error: "Admin only" });
  next();
};

import jwt from "jsonwebtoken";
import User from "../models/User.js";

const { verify } = jwt;

export default async function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.id).select("-password");
    if (!req.user) return res.status(401).json({ message: "Invalid token" });
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid" });
  }
}

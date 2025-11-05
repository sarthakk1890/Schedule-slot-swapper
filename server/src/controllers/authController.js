import jwt from "jsonwebtoken";
import User from "../models/User.js";

const { sign } = jwt;

function signToken(user) {
  return sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

export async function signup(req, res) {
  const { name, email, password } = req.body;
  try {
    const user = await User.create({ name, email, password });
    res.json({
      token: signToken(user),
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });
    res.json({
      token: signToken(user),
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

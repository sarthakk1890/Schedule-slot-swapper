import { Router } from "express";
const router = Router();
import auth from "../middleware/auth.js";
import {
  createEvent,
  getMyEvents,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController.js";

router.use(auth);
router.post("/", createEvent);
router.get("/me", getMyEvents);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);

export default router;

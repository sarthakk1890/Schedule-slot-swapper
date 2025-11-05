import { Router } from "express";
const router = Router();
import auth from "../middleware/auth.js";
import {
  getSwappableSlots,
  createSwapRequest,
  respondToSwap,
  getAllSwapRequests,
  getIncomingRequests,
  getOutgoingRequests,
} from "../controllers/swapController.js";

router.use(auth);

router.get("/swappable-slots", getSwappableSlots);
router.post("/swap-request", createSwapRequest);
router.post("/swap-response/:requestId", respondToSwap);
router.get("/swap-requests/all", getAllSwapRequests);
router.get("/swap-requests/incoming", getIncomingRequests);
router.get("/swap-requests/outgoing", getOutgoingRequests);

export default router;

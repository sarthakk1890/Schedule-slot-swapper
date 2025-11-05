import { startSession } from "mongoose";
import Event from "../models/Event.js";
import SwapRequest from "../models/SwapRequest.js";

// -------GET /api/swappable-slots
export async function getSwappableSlots(req, res) {
  try {
    const slots = await Event.find({
      status: "SWAPPABLE",
      owner: { $ne: req.user._id },
    })
      .populate("owner", "name email")
      .sort({ startTime: 1 });

    return res.json(slots);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch swappable slots" });
  }
}

// -------POST /api/swap-request
// -------Body: { mySlotId, theirSlotId }
export async function createSwapRequest(req, res) {
  const { mySlotId, theirSlotId } = req.body;
  if (!mySlotId || !theirSlotId)
    return res
      .status(400)
      .json({ message: "mySlotId and theirSlotId required" });

  const session = await startSession();
  session.startTransaction();
  try {
    const mySlot = await Event.findById(mySlotId).session(session);
    const theirSlot = await Event.findById(theirSlotId).session(session);

    if (!mySlot || !theirSlot) throw new Error("One or both slots not found");
    if (!mySlot.owner.equals(req.user._id))
      throw new Error("You do not own the offered slot");
    if (mySlot.status !== "SWAPPABLE" || theirSlot.status !== "SWAPPABLE")
      throw new Error("Both slots must be SWAPPABLE");

    const swapReq = await SwapRequest.create(
      [
        {
          fromUser: req.user._id,
          toUser: theirSlot.owner,
          mySlot: mySlot._id,
          theirSlot: theirSlot._id,
          status: "PENDING",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const populated = await SwapRequest.findById(swapReq[0]._id).populate(
      "fromUser toUser mySlot theirSlot"
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${theirSlot.owner.toString()}`).emit(
        "swap-request-received",
        {
          swapRequest: populated,
          message: `${req.user.name} wants to swap slots with you`,
        }
      );

      //socket when new swap request is created
      io.emit("new-swap-request", {
        swapRequest: populated,
      });
    }

    return res.status(201).json(populated);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return res
      .status(400)
      .json({ message: err.message || "Swap creation failed" });
  }
}

// -------POST /api/swap-response/:requestId
// -------Body: { accept: true/false }
export async function respondToSwap(req, res) {
  const { requestId } = req.params;
  const { accept } = req.body;

  if (typeof accept !== "boolean")
    return res.status(400).json({ message: "accept must be boolean" });

  const session = await startSession();
  session.startTransaction();
  try {
    const swap = await SwapRequest.findById(requestId).session(session);
    if (!swap) throw new Error("Swap request not found");

    // Only the recipient can respond
    if (!swap.toUser.equals(req.user._id)) throw new Error("Unauthorized");

    // Check if swap request has already been processed
    if (swap.status !== "PENDING") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: `Swap request has already been ${swap.status.toLowerCase()}`,
      });
    }

    const mySlot = await Event.findById(swap.mySlot).session(session);
    const theirSlot = await Event.findById(swap.theirSlot).session(session);
    if (!mySlot || !theirSlot) throw new Error("Associated slots missing");

    // Verify slots are still swappable
    if (mySlot.status !== "SWAPPABLE" || theirSlot.status !== "SWAPPABLE") {
      // If slots are not swappable, mark swap as rejected
      swap.status = "REJECTED";
      await swap.save({ session });
      await session.commitTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Slots are no longer available for swap" });
    }

    if (accept) {
      // SWAP OWNERS and mark as BUSY
      const tempOwner = mySlot.owner;
      mySlot.owner = theirSlot.owner;
      theirSlot.owner = tempOwner;

      // Only mark as BUSY when swap is accepted
      mySlot.status = "BUSY";
      theirSlot.status = "BUSY";
      swap.status = "ACCEPTED";

      await mySlot.save({ session });
      await theirSlot.save({ session });
      await swap.save({ session });
    } else {
      // only status changes
      swap.status = "REJECTED";
      await swap.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    // Fetch the updated swap request with populated fields
    const populated = await SwapRequest.findById(swap._id)
      .populate("fromUser", "name email")
      .populate("toUser", "name email")
      .populate("mySlot")
      .populate("theirSlot");

    if (!populated) {
      return res
        .status(500)
        .json({ message: "Failed to fetch updated swap request" });
    }

    const io = req.app.get("io");
    if (io) {
      const senderId = populated.fromUser._id.toString();
      const recipientId = populated.toUser._id.toString();

      if (accept) {
        // Notify both users about swap completion
        io.to(`user:${senderId}`).emit("swap-request-accepted", {
          swapRequest: populated,
          message: `${populated.toUser.name} accepted your swap request!`,
        });
        io.to(`user:${senderId}`).emit("swap-completed", {
          swapRequest: populated,
          message:
            "Swap completed successfully! Your dashboard has been updated.",
        });
        io.to(`user:${recipientId}`).emit("swap-completed", {
          swapRequest: populated,
          message:
            "Swap completed successfully! Your dashboard has been updated.",
        });

        // Notify all users that slots are no longer swappable
        io.emit("slot-no-longer-swappable", {
          eventId: mySlot._id.toString(),
          message: "A slot is no longer swappable",
        });
        io.emit("slot-no-longer-swappable", {
          eventId: theirSlot._id.toString(),
          message: "A slot is no longer swappable",
        });
      } else {
        io.to(`user:${senderId}`).emit("swap-request-rejected", {
          swapRequest: populated,
          message: `${populated.toUser.name} rejected your swap request.`,
        });
      }
      // Notify all users about swap request update
      io.emit("swap-request-updated", {
        swapRequest: populated,
      });
    }

    return res.json(populated);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return res
      .status(400)
      .json({ message: err.message || "Failed to respond to swap" });
  }
}

// -------GET /api/swap-requests/all
export async function getAllSwapRequests(req, res) {
  try {
    const list = await SwapRequest.find()
      .populate("fromUser toUser mySlot theirSlot")
      .sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Failed to fetch all swap requests" });
  }
}

// -------GET /api/swap-requests/incoming
export async function getIncomingRequests(req, res) {
  try {
    const list = await SwapRequest.find({ toUser: req.user._id })
      .populate("fromUser toUser mySlot theirSlot")
      .sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Failed to fetch incoming requests" });
  }
}

// -------GET /api/swap-requests/outgoing
export async function getOutgoingRequests(req, res) {
  try {
    const list = await SwapRequest.find({ fromUser: req.user._id })
      .populate("fromUser toUser mySlot theirSlot")
      .sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Failed to fetch outgoing requests" });
  }
}

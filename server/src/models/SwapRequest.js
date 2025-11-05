import { Schema, model } from "mongoose";

const SwapRequestSchema = new Schema(
  {
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mySlot: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    theirSlot: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

export default model("SwapRequest", SwapRequestSchema);

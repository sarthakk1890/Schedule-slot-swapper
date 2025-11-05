import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";

const { genSalt, hash, compare } = bcrypt;
const UserSchema = new Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await genSalt(10);
  this.password = await hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidate) {
  return compare(candidate, this.password);
};

export default model("User", UserSchema);

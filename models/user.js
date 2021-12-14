const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    isTeacher: { type: Boolean, default: false, required: true },
    data: { type: Array, default: [], required: false },
  },
  { collection: "Finalize_project" }
);
const User = mongoose.model("User", UserSchema);
module.exports = User;

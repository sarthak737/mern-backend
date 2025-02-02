import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import { User } from "../models/user.models.js";

const registerUser = asyncHandler(async (req, res) => {
  const { username, fullName, email, password } = req.body;

  if (
    [username, fullName, email, password].some((field) => field?.trim() === "")
  ) {
    throw new APIError(400, "All feilds are required");
  }

  const existingUser = User.find({ $or: [email, username] });
  if (existingUser) {
    throw new APIError(400, "User exists");
  }
});

export { registerUser };

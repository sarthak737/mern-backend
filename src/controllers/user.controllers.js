import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/fileUpload.js";
import { APIResponse } from "../utils/APIResponse.js";

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

  const avatarlocalpath = req.files?.avatar[0]?.path;
  const coverlocalpath = req.files?.cover[0]?.path;

  if (!avatarlocalpath) {
    throw new APIError(400, "Avatar Required");
  }
  const avatar = await uploadOnCloudinary(avatarlocalpath);
  const cover = await uploadOnCloudinary(coverlocalpath);
  if (!avatar) {
    throw new APIError(400, "Avatar Required");
  }

  const user = await User.create({
    username,
    fullName,
    email,
    password,
    avatar: avatar.url,
    cover: cover?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new APIError("Something Wrong Registering User");
  }

  return res
    .status(201)
    .json(new APIResponse(200, createdUser, "User Registered Successfully"));
});

export { registerUser };

import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/fileUpload.js";
import { APIResponse } from "../utils/APIResponse.js";
import { response } from "express";

const generateAccessAndRefreshToken = async (userID) => {
  try {
    const user = await User.findById(userID);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new APIError(500, "Error generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, fullName, email, password } = req.body;

  if (
    [username, fullName, email, password].some((field) => field?.trim() === "")
  ) {
    throw new APIError(400, "All feilds are required");
  }

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new APIError(400, "User exists");
  }

  const avatarlocalpath = req.files?.avatar[0]?.path;
  const coverlocalpath = req.files?.cover[0]?.path;

  if (!avatarlocalpath) {
    throw new APIError(400, "Avatar Required");
  }
  const avatar = await uploadOnCloudinary(avatarlocalpath);
  console.log("Avatar upload response:", avatar);

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

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email) {
    throw new APIError(400, "Enter username or email");
  }

  const user = await User.findOne({
    $or: [{ username, email }],
  });

  if (!user) {
    throw new APIError(404, "User not found");
  }

  const isPassValid = await user.isPasswordCorrect(password);

  if (!isPassValid) {
    throw new APIError(401, "Wrong Password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedInUser = user
    .findById(user_.id)
    .select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new APIResponse(
        200,
        {
          user,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

export { registerUser };

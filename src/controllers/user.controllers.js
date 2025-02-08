import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/fileUpload.js";
import { APIResponse } from "../utils/APIResponse.js";
import jwt from "jsonwebtoken";

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
  if (!(username || email)) {
    throw new APIError(400, "Enter username or email");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
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
  const loggedInUser = User.findById(user._id).select(
    "-password -refreshToken"
  );

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

const logoutUser = asyncHandler(async (req, res) => {
  const user = User.findByIdAndUpdate(req.user._id, {
    $set: { refreshToken: undefined },
  });
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new APIResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const inRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!inRefreshToken) {
    throw new APIError(401, "Unauthorized access");
  }
  try {
    const decodedToken = jwt.verify(
      inRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new APIError(401, "Invalid refresh token");
    }

    if (inRefreshToken !== user?.refreshToken) {
      throw new APIError(401, "Refresh Token Expired");
    }

    const optios = {
      httpOnly: true,
      secure: true,
    };

    const { newRefreshToken, accessToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new APIResponse(
          200,
          { accessToken, refreshToken },
          "Acces token refresh"
        )
      );
  } catch (error) {
    throw new APIError(401, error?.message || "Invalid refresh token ");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPass, newPass } = req.body;
  const user = await User.findById(req.user?.id);
  const isCorrectPass = await user.isPasswordCorrect(oldPass);

  if (!isCorrectPass) {
    throw new APIError(400, "Old password wrong");
  }

  user.password = newPass;
  await user.save({ validateBeforeSave: false });
  return res.status(200).json(new APIResponse(200, {}, "Password Changed"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new APIResponse(200, req.user, "current user fetched"));
});

const updateUser = asyncHandler(async (req, res) => {
  const { newName } = req.body;
  if (!newName) {
    throw new APIError(400, "Name req");
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: newName,
      },
    },
    { new: true }
  ).select("-password");
  return res.status(200).json(new APIResponse(200, user, "Name changed"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarPath = req.file?.path;
  if (!avatarPath) {
    throw new APIError(401, "Avatar not found");
  }
  const avatar = await uploadOnCloudinary(avatarPath);

  if (!avatar.url) {
    throw new APIError(401, "Avatar not uploaded");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select("-password");

  return new APIResponse(200, user, "Avatar changed");
});
const updateCover = asyncHandler(async (req, res) => {
  const coverPath = req.file?.path;
  if (!coverPath) {
    throw new APIError(401, "Cover not found");
  }
  const cover = await uploadOnCloudinary(coverPath);

  if (!cover.url) {
    throw new APIError(401, "cover not uploaded");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { cover: cover.url },
    },
    { new: true }
  ).select("-password");
  return new APIResponse(200, user, "Cover changed");
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateUser,
  updateAvatar,
  updateCover,
};

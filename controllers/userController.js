const User = require("../models/user.js");
const Notification = require("../models/notification.js");
const { createJWT } = require("../utils/index.js");

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, isAdmin, role, title } = req.body;

    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json({
        status: false,
        message: "User already exists",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      isAdmin,
      role,
      title,
    });

    if (user) {
      // TODO: changed only for Admin and createJWT
      createJWT(res, user._id);

      const newUser = await User.findById(user._id).select("-password");

      return res.status(201).json(newUser);
    } else {
      return res.status(400).json({
        status: false,
        message: "Invalid user data",
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid email or Password." });
    }
    if (!user?.isActive) {
      return res.status(401).json({
        status: false,
        message: "User account has been deactivated, contact the administrator",
      });
    }
    const isMatch = await user.matchPassword(password);

    if (user && isMatch) {
      createJWT(res, user._id);
      const newUser = await User.findById(user._id).select("-password");
      res.status(200).json(newUser);
    } else {
      return res
        .status(401)
        .json({ status: false, message: "Invalid email or password" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

const logoutUser = async (req, res) => {
  try {
    res.cookie("token", "", {
      httpOnly: true,
      expires: new Date(0),
    });
    return res.status(200).json({ message: "Logout Sucessful" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

const getTeamList = async (req, res) => {
  try {
    const users = await User.find().select("name title role email isActive");
    return res.status(200).json(users);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

const getNotificationsList = async (req, res) => {
  try {
    const { userId } = req.user;

    const notice = await Notification.find({
      team: userId,
      isRead: { $nin: [userId] },
    }).populate("task", "title");

    res.status(201).json(notice);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { userId } = req.user;
    const { isReadType, id } = req.query;
    if (isReadType === "all") {
      await Notification.updateMany(
        { team: userId, isRead: { $nin: [userId] } },
        { $push: { isRead: userId } }
      );
    } else {
      await Notification.updateMany(
        { _id: id, isRead: { $nin: [userId] } },
        { $push: { isRead: userId } }
      );
    }
    res.status(200).json({status: true, message: "Done"})
  } catch (error) {
    return res.status(500).json({status: false, message: error.message})
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { userId, isAdmin } = req.user;
    const { _id } = req.body;
    const id =
      isAdmin && userId === _id
        ? userId
        : isAdmin && userId !== _id
        ? _id
        : userId;
    const user = await User.findById(id);
    if (user) {
      user.name = req.body.name || user.name;
      user.role = req.body.role || user.role;
      user.title = req.body.title || user.title;

      await user.save();
      const updatedUser = await User.findById(id).select("-password");
      res.status(200).json({
        status: true,
        message: "Profile Updated Successfully",
        user: updatedUser,
      });
    } else {
      res.status(404).json({ status: false, message: "User not found" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

const changeUserPassword = async (req, res) => {
  try {
    const { userId } = req.user;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ status: false, message: "Password is required" });
    }
    const user = await User.findById(userId);
    if (user) {
      user.password = password;
      await user.save();
      res.status(201).json({
        status: true,
        message: "Password changed successfully.",
      });
    } else {
      res.status(404).json({ status: false, message: "User not found" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
};


const activateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (user) {
      user.isActive = req.body.isActive;

      await user.save();

      res.status(201).json({
        status: true,
        message: `User account has been ${
          user?.isActive ? "activated" : "disabled"
        }`,
      });
    } else {
      res.status(404).json({ status: false, message: "User not found" });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

const deleteUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    await User.findByIdAndDelete(id);

    res
      .status(200)
      .json({ status: true, message: "User deleted successfully" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getTeamList,
  getNotificationsList,
  updateUserProfile,
  markNotificationRead,
  changeUserPassword,
  activateUserProfile,
  deleteUserProfile,
};

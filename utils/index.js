const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const dbConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("DB connection established");
  } catch (error) {
    console.log("DB Connection Error: " + error);
  }
};

const createJWT = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "None", //allow cookie
    maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
  });
};


module.exports = { dbConnection, createJWT };

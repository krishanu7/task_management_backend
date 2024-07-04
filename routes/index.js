const express = require("express");
const userRoutes = require("./userRoutes.js");
const taskRoutes = require("./taskRoutes.js");

const router = express.Router();

router.use("/user", userRoutes);
router.use("/task", taskRoutes);

module.exports = router;

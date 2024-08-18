const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const Mailgen = require("mailgen");

const sendWelcomeEmail = async (name, email, password, role, title) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: "smtp.gmail.com",
      auth: {
        user: "krishanu1137@gmail.com",
        pass: "ryskuplikbopgyyk",
      },
    });

    let MailGenerator = new Mailgen({
      theme: "default",
      product: {
        name: "Task Manager",
        link: "https://tasknavigation-krishanu7s-projects.vercel.app",
      },
    });

    let response = {
      body: {
        name: name,
        intro: "Welcome to the Task Manager Application!",
        table: {
          data: [
            {
              item: "Role",
              description: role,
            },
            {
              item: "Title",
              description: title,
            },
            {
              item: "Password",
              description: password,
            },
          ],
        },
        outro: "You can log in to your account using the credentials provided.",
      },
    };

    let mail = MailGenerator.generate(response);

    let message = {
      from: "krishanu1137@gmail.com",
      to: email,
      subject: "Welcome to Task Manager",
      html: mail,
    };

    await transporter.sendMail(message);
    console.log("Welcome email sent successfully to", email);
  } catch (error) {
    console.error("Error sending welcome email:", error.message);
    throw new Error("Email sending failed");
  }
};

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


module.exports = { dbConnection, createJWT, sendWelcomeEmail };

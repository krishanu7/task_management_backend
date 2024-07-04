const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const { dbConnection } = require("./utils");
const cors = require("cors");
const PORT = 8080 || process.env.PORT;
const {
  routeNotFound,
  errorHandler,
} = require("./middleware/errorMiddlewares.js");
const routes = require("./routes/index.js");
dotenv.config();
dbConnection();
app = express();
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://tasknavigation-krishanu7s-projects.vercel.app",
      "https://tasknavigation-git-main-krishanu7s-projects.vercel.app/",
    ],
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", routes);

app.use(routeNotFound);
app.use(errorHandler);
app.listen(PORT, () => {
  console.log(`Server is listening on ${PORT}`);
});

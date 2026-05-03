const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const http = require("http");

const connectDb = require("./config/dbConnect");
const authRoute = require("./routes/authRoute");
const chatRoute = require("./routes/chatRoute");
const statusRoute = require("./routes/statusRoute");
const socketService = require("./services/socketService");

dotenv.config();

const PORT = process.env.PORT || 5001;

const app = express();

// ---------------- MIDDLEWARE ----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const corsOptions = {
  origin: [
    process.env.CLIENT_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
  ],
  credentials: true,
};

app.use(cors(corsOptions));

// ---------------- SERVER ----------------
const server = http.createServer(app);
const io = socketService(server);

// attach socket to request
app.use((req, res, next) => {
  req.io = io;
  req.socketUserMap = io.socketUserMap;
  next();
});

// ---------------- DB ----------------
connectDb();

// ---------------- ROUTES ----------------
app.use("/api/auth", authRoute);
app.use("/api/chat", chatRoute);
app.use("/api/status", statusRoute);

// ---------------- START ----------------
server.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
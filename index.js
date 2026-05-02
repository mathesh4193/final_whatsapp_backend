const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { connect } = require('mongoose');
const connectDb = require('./config/dbConnect');
const authRoute = require('./routes/authRoute');
const chatRoute = require('./routes/chatRoute');
const statusRoute = require('./routes/statusRoute');
const socketService = require('./services/socketService');
const http = require('http');


const bodyParser = require('body-parser');




dotenv.config();

const PORT = process.env.PORT;
const app = express();


//Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

app.use(cors(corsOptions));

//create server
const server = http.createServer(app);

const io = socketService(server);

app.use((req, res, next) => {
  req.io = io;
  req.socketUserMap = io.socketUserMap;
  next();
});

//database connection
connectDb()


//rotues
app.use('/api/auth', authRoute);
app.use('/api/chat', chatRoute);
app.use('/api/status', statusRoute);



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
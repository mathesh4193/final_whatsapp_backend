const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { connect } = require('mongoose');
const connectDb = require('./config/dbConnect');
const bodyParser = require('body-parser');




dotenv.config();

const PORT = process.env.PORT;
const app = express();


//Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));





//database connection
connectDb()


//rotues
app.use('/api/auth', require('./routes/authRoute'));


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
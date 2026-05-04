const mongoose = require('mongoose');
const dns = require('dns');

// Set DNS servers to Google's as a workaround for SRV record resolution issues
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    console.warn('Could not set DNS servers:', e.message);
}

const connectDB = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');
    }catch(error){
        console.error('error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;

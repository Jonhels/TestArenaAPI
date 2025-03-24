const mongoose = require("mongoose");
dotenv = require("dotenv");

const dbConnect = async (params) => {
    try {
        const connection = await mongoose.connect(process.env.MONGO_URI);
        console.log(`Successfully connected to database: ${connection.connection.host}`);
    } catch (error) {
        console.error("Error connection to database", error);
        process.exit(1);
    }
};

module.exports = dbConnect;
import mongoose from "mongoose";
import dotenv from "dotenv";

const dbConnect=async()=>{

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.log(error);
    }
}

export default dbConnect;

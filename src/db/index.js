import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(
      `${process.env.MONGO_URI}/${DB_NAME}`
    );
    console.log("DB Connected! HOST:", connection.connection.host);
  } catch (error) {
    console.error(`Error connecting DB ${error}`);
    process.exit(1);
  }
};

export default connectDB;

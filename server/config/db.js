
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // Connection pool settings
      maxPoolSize: 50,              // Maximum number of connections in pool
      minPoolSize: 10,              // Minimum number of connections
      maxIdleTimeMS: 30000,         // Close connections after 30s of inactivity
      
      // Timeout settings
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      socketTimeoutMS: 45000,       // Socket timeout
      connectTimeoutMS: 10000,      // Connection timeout
      
      // Note: bufferCommands and bufferMaxEntries were removed in Mongoose 8.x
      // Mongoose 8.x handles command buffering automatically when disconnected
    });
    console.log("MongoDB connected");

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

  } catch (error) {
    console.error("Error connecting to MongoDB", error);
    process.exit(1);
  }
};


export default connectDB;

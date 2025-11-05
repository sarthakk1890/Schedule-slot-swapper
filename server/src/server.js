import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initializeSocket } from "./socket.js";

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    
    // Initialize Socket.io
    const io = initializeSocket(server);
    
    // Make io available globally for use in controllers
    app.set("io", io);
    
    console.log(`Socket.io initialized`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

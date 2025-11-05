import { connect } from "mongoose";
const connectDB = async (uri) => {
  await connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};
export default connectDB;

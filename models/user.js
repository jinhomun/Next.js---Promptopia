import { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  email: {
    type: String,
    unique: [true, "Email already exists!"],
    required: [true, "Email is required!"],
  },
  username: {
    type: String,
    required: [true, "Username is required!"],
    match: [
      /^(?=.{2,20}$)(?![.])(?!.*[.]{2})[a-zA-Z0-9.가-힣]+(?<![.])$/,
      "Username invalid, it should contain 2-20 alphanumeric or Korean letters and be unique!",
    ],
  },
  image: {
    type: String,
  },
});

const User = models.User || model("User", UserSchema);

export default User;
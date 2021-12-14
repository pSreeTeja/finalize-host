const jwt = require("jsonwebtoken");
const UserModel = require("../models/user");

const Authenticate = async (req, res, next) => {
  console.log("Hello from authenticate");
  try {
    const token = req.cookies.jwtoken;
    const verifyToken = jwt.verify(token, process.env.SECRET_KEY);
    const rootUser = await UserModel.findOne({ _id: verifyToken._id });
    console.log(rootUser);
    if (!rootUser) {
      console.log("throwing error!!!!");
      throw new Error("User not found");
    }
    req.token = token;
    req.rootUser = rootUser;
    next();
  } catch (err) {
    res.status(401).send("unauthorized");
    console.log(err);
  }
};
module.exports = Authenticate;

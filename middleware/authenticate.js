const jwt = require("jsonwebtoken");
const UserModel = require("../models/user");

const Authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.jwtoken;
    const verifyToken = jwt.verify(token, process.env.SECRET_KEY);
    const rootUser = await UserModel.findOne({ _id: verifyToken._id });
    console.log(rootUser);
    if (!rootUser) {
      throw new Error("User not found");
    }
    req.token = token;
    req.rootUser = rootUser;
    req.status = 200;
    next();
  } catch (err) {
    res.status(401).send("unauthorized");
    console.log(err);
  }
};
module.exports = Authenticate;

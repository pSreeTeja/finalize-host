const jwt = require("jsonwebtoken");
const pool = require("../db");

const Authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.jwtoken;
    const verifyToken = jwt.verify(token, process.env.SECRET_KEY);
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [verifyToken._id]);
    const rootUser = userResult.rows[0];
    console.log(rootUser);
    if (!rootUser) {
      throw new Error("User not found");
    }
    req.token = token;
    req.rootUser = rootUser;
    req.status = 200;
    next();
  } catch (err) {
    res.status(401).send("Unauthorized");
    console.log(err);
  }
};
module.exports = Authenticate;

const express = require("express");
const validator = require("email-validator");
const app = express();
// const cors = require("cors");
const pool = require("./db");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
// const UserModel = require("./models/user");
// const ProjectModel = require("./models/project");
const authenticate = require("./middleware/authenticate");
// const ObjectId = require("mongodb").ObjectId;
// const vars = require("./my_secret/my_secrets");
// const nodemailer = require("nodemailer");
require("dotenv").config();
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:3000', 'https://finalize.netlify.app'];
  const incomingOrigin = req.headers.origin;
  if (allowedOrigins.includes(incomingOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", incomingOrigin);
  }
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  next();
});

// Initialize database tables
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_teacher BOOLEAN DEFAULT FALSE,
        data JSONB DEFAULT '[]'
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        project_title VARCHAR(255) NOT NULL,
        about_project TEXT NOT NULL,
        project_deadline VARCHAR(255) NOT NULL,
        link VARCHAR(255) NOT NULL,
        submitted_data JSONB DEFAULT '[]'
      );
    `);
    console.log('Database tables initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

initDB();
app.use(express.json());
app.use(cookieParser());
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   secure: false,
//   auth: {
//     user: "managemyworkhere@gmail.com",
//     pass: vars.pass,
//   },
//   tls: {
//     rejectUnauthorized: false,
//     secureProtocol: "TLSv1_method",
//   },
// });
app.get("/", async (req, res) => {
  res.send("Hello");
});
app.get("/ping", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});
app.post("/register", async (req, res) => {
  // console.log(JSON.stringify(req.body));
  try {
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [req.body.email]);
    if (userExists.rows.length > 0) {
      return res.status(403).json({
        error: "Account already exists",
      });
    }
    if (validator.validate(req.body.email)) {
      await pool.query(
        'INSERT INTO users (name, email, password, is_teacher) VALUES ($1, $2, $3, $4)',
        [req.body.name, req.body.email, req.body.password, req.body.isTeacher]
      );
      console.log("OK");
      res.status(201).send("OK");
    } else {
      return res.status(422).json({
        error: "Enter a valid Email Address",
      });
    }
  } catch (err) {
    res.send(err);
    console.log(err);
  }
});
app.post("/login", async (req, res) => {
  // console.log("SECRET  :" + vars.pass);
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [req.body.email]);
    const user = userResult.rows[0];
    console.log("USER DETAILS");
    console.log(user);
    if (user && user.password == req.body.password) {
      // console.log(user);
      const token = jwt.sign({ _id: user.id }, process.env.SECRET_KEY);
      // console.log(token);
      res.cookie("jwtoken", token, {
        maxAge: 1 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      res.status(200).send();
    } else {
      res.status(401).send();
    }
  } catch (err) {
    res.status(401).send();
  }
});
app.get("/isAuthenticated", authenticate, (req, res) => {
  if (req.status == 200) {
    res.status = 200;
    res.send();
  }
  res.status = 401;
  res.send();
});
app.get("/data", authenticate, (req, res) => {
  res.send(req.rootUser);
});
app.get("/logout", (req, res) => {
  // res.clearCookie("jwtoken", { path: "/" });
  res.cookie("jwtoken", "", {
    maxAge: 1,
    secure: true,
    sameSite: "none",
  });
  res.status(200).send("Logged Out");
});
app.post("/forgotpassword", (req, res) => {});
app.post("/creategroupapi", authenticate, async (req, res) => {
  // console.log(req.rootUser);
  // console.log(req.body);
  try {
    const result = await pool.query(
      'INSERT INTO projects (project_title, about_project, project_deadline, link, submitted_data) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [req.body.projectTitle, req.body.aboutProject, req.body.date, '', []]
    );
    const projectId = result.rows[0].id;
    await pool.query(
      'UPDATE projects SET link = $1 WHERE id = $2',
      [`http://finalize.netlify.app/invite/${projectId}`, projectId]
    );
    await pool.query(
      'UPDATE users SET data = data || $1 WHERE id = $2',
      [[projectId], req.rootUser.id]
    );
    res.status(200).send();
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});
app.get("/displaygroups", authenticate, async (req, res) => {
  // console.log(req.rootUser);
  try {
    const data_send = [];
    for (let i = 0; i < req.rootUser.data.length; i++) {
      const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [req.rootUser.data[i]]);
      if (projectResult.rows.length > 0) {
        data_send.push(projectResult.rows[0]);
      }
    }
    // console.log(data_send);
    res.status(200).send(data_send);
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});

app.post("/invite", authenticate, async (req, res) => {
  console.log("IN INVITE API");
  try {
    await pool.query(
      'UPDATE users SET data = data || $1 WHERE id = $2',
      [[parseInt(req.body.groupId)], req.rootUser.id]
    );
    res.status(200).send();
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});
app.post("/addstudentproject", authenticate, async (req, res) => {
  // console.log("RECEIVED FROM CLIENT");
  // console.log(req.body);
  try {
    const submission = {
      email: req.body.email,
      projectTitle: req.body.projectTitle,
      abstract: req.body.abstract,
      teamMem1: req.body.teamMem1,
      teamMem2: req.body.teamMem2,
      teamMem3: req.body.teamMem3,
      teamMem4: req.body.teamMem4,
      projectLink: req.body.projectLink,
      didAdd: true,
      isApproved: false,
      completed: false,
    };
    await pool.query(
      'UPDATE projects SET submitted_data = submitted_data || $1 WHERE id = $2',
      [[submission], req.body._id]
    );
    res.status(200).send();
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});
app.post("/updatestudentproject", authenticate, async (req, res) => {
  try {
    const projectResult = await pool.query('SELECT submitted_data FROM projects WHERE id = $1', [req.body._id]);
    const submittedData = projectResult.rows[0].submitted_data;
    const index = submittedData.findIndex(item => item.email === req.body.email);
    if (index !== -1) {
      submittedData[index] = {
        email: req.body.email,
        projectTitle: req.body.projectTitle,
        abstract: req.body.abstract,
        teamMem1: req.body.teamMem1,
        teamMem2: req.body.teamMem2,
        teamMem3: req.body.teamMem3,
        teamMem4: req.body.teamMem4,
        projectLink: req.body.projectLink,
        didAdd: true,
        isApproved: req.body.isEditDetails ? false : true,
        completed: false,
      };
      await pool.query(
        'UPDATE projects SET submitted_data = $1 WHERE id = $2',
        [JSON.stringify(submittedData), req.body._id]
      );
      if (!req.body.isEditDetails) {
        // Send email if approved
        // const mailOptions = { ... };
        // transporter.sendMail...
      }
    }
    res.status(200).send();
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});
app.post("/submitProject", authenticate, async (req, res) => {
  try {
    const projectResult = await pool.query('SELECT submitted_data FROM projects WHERE id = $1', [req.body._id]);
    const submittedData = projectResult.rows[0].submitted_data;
    const index = submittedData.findIndex(item => item.email === req.body.email);
    if (index !== -1) {
      submittedData[index] = {
        email: req.body.email,
        projectTitle: req.body.projectTitle,
        abstract: req.body.abstract,
        teamMem1: req.body.teamMem1,
        teamMem2: req.body.teamMem2,
        teamMem3: req.body.teamMem3,
        teamMem4: req.body.teamMem4,
        projectLink: req.body.projectLink,
        didAdd: true,
        isApproved: true,
        completed: true,
      };
      await pool.query(
        'UPDATE projects SET submitted_data = $1 WHERE id = $2',
        [JSON.stringify(submittedData), req.body._id]
      );
    }
    res.status(200).send();
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});
app.post("/rejectproject", authenticate, async (req, res) => {
  try {
    const projectResult = await pool.query('SELECT submitted_data FROM projects WHERE id = $1', [req.body._id]);
    const submittedData = projectResult.rows[0].submitted_data;
    const filteredData = submittedData.filter(item => item.email !== req.body.email);
    await pool.query(
      'UPDATE projects SET submitted_data = $1 WHERE id = $2',
      [JSON.stringify(filteredData), req.body._id]
    );
    // Send rejection email
    // const mailOptions = { ... };
    // transporter.sendMail...
    res.status(200).send();
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});
app.post("/deletegroup", authenticate, async (req, res) => {
  console.log("GROUP ID RECEIVED");
  console.log(req.body._id);
  try {
    // Remove project id from all users' data
    await pool.query(
      'UPDATE users SET data = array_remove(data, $1)',
      [req.body._id]
    );
    // Delete the project
    await pool.query('DELETE FROM projects WHERE id = $1', [req.body._id]);
    res.status(200).send();
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Server started");
});

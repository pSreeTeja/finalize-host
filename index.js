const express = require("express");
const app = express();
// const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const UserModel = require("./models/user");
const ProjectModel = require("./models/project");
const authenticate = require("./middleware/authenticate");
const ObjectId = require("mongodb").ObjectId;
const secrets = require("./secret/secret");
const nodemailer = require("nodemailer");
require("dotenv").config();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://finalize.netlify.app");
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
mongoose.connect(
  "mongodb+srv://dbms_finalize:finalize123@cluster0.5ndw9.mongodb.net/Finalize?retryWrites=true&w=majority",
  { useNewUrlParser: true }
);
app.use(express.json());
app.use(cookieParser());
const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: false,
  auth: {
    user: "managemyworkhere@gmail.com",
    pass: secrets.pass,
  },
  tls: {
    rejectUnauthorized: false,
    secureProtocol: "TLSv1_method",
  },
});
app.get("/", async (req, res) => {
  res.send("Hello");
});
app.post("/register", async (req, res) => {
  // console.log(JSON.stringify(req.body));
  try {
    const userExists = await UserModel.findOne({
      email: req.body.email,
    });
    if (userExists) {
      return res.status(403).json({
        error: "Account already exists",
      });
    }
    const user = new UserModel({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      isTeacher: req.body.isTeacher,
    });
    await user.save();
    console.log("OK");
    res.status(201).send("OK");
  } catch (err) {
    res.send(err);
    console.log(err);
  }
});
app.post("/login", async (req, res) => {
  // console.log("SECRET  :" + secrets.pass);
  try {
    const user = await UserModel.findOne({ email: req.body.email });
    // console.log("USER DETAILS");
    if (user.password == req.body.password) {
      // console.log(user);
      const token = jwt.sign({ _id: user._id }, process.env.SECRET_KEY);
      // console.log(token);
      res.cookie("jwtoken", token, {
        maxAge: 1 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        domain: "finalize.herokuapp.com",
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
app.get("/data", authenticate, (req, res) => {
  res.send(req.rootUser);
});
app.get("/logout", (req, res) => {
  // res.clearCookie("jwtoken", { path: "/" });
  res.cookie("jwtoken", "", {
    maxAge: 1,
    domain: "finalize.herokuapp.com",
    secure: true,
    sameSite: "none",
  });
  res.status(200).send("Logged Out");
});
app.post("/forgotpassword", (req, res) => {});
app.post("/creategroupapi", authenticate, async (req, res) => {
  // console.log(req.rootUser);
  // console.log(req.body);
  const data_recv = {
    projectTitle: req.body.projectTitle,
    aboutProject: req.body.aboutProject,
    projectDeadline: req.body.date,
    link: req.body.link,
    submittedData: [],
  };
  const project = new ProjectModel(data_recv);
  project.save(async () => {
    // console.log("CREATING NEW GROUP");
    // console.log(project._id.toString());
    const newProject = await ProjectModel.findOneAndUpdate(
      {
        _id: project._id.toString(),
      },
      {
        $set: {
          link: "http://finalize.netlify.app/invite/" + project._id.toString(),
        },
      }
    );
  });
  // console.log("REQ.ROOTSUER.ID");
  // console.log(req.rootUser.id);
  const user = await UserModel.updateOne(
    { _id: req.rootUser.id },
    {
      $push: { data: project._id },
    }
  );
  res.status(200).send();
});
app.get("/displaygroups", authenticate, async (req, res) => {
  // console.log(req.rootUser);
  const data_send = [];
  for (let i = 0; i < req.rootUser.data.length; i++) {
    const project = await ProjectModel.find({ _id: req.rootUser.data[i] });
    data_send.push(project[0]);
  }
  // console.log(data_send);
  res.status(200).send(data_send);
});

app.post("/invite", authenticate, async (req, res) => {
  console.log("IN INVITE API");
  const user = await UserModel.findOneAndUpdate(
    { _id: req.rootUser.id },
    { $push: { data: ObjectId(req.body.groupId) } }
  );
  res.status(200).send();
});
app.post("/addstudentproject", authenticate, async (req, res) => {
  // console.log("RECEIVED FROM CLIENT");
  // console.log(req.body);
  await ProjectModel.findOneAndUpdate(
    { _id: ObjectId(req.body._id) },
    {
      $push: {
        submittedData: {
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
        },
      },
    }
  ).then(console.log("update successful"));
  res.status(200).send();
});
app.post("/updatestudentproject", authenticate, async (req, res) => {
  if (req.body.isEditDetails) {
    await ProjectModel.updateOne(
      {
        _id: ObjectId(req.body._id),
        "submittedData.email": { $eq: req.body.email },
      },
      {
        $set: {
          "submittedData.$": {
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
          },
        },
      }
    );
  } else {
    await ProjectModel.updateOne(
      {
        _id: ObjectId(req.body._id),
        "submittedData.email": { $eq: req.body.email },
      },
      {
        $set: {
          "submittedData.$": {
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
            completed: false,
          },
        },
      }
    ).then(() => {
      const mailOptions = {
        from: "managemyworkhere@gmail.com",
        to: req.body.email, //change afterwards
        subject: req.body.projectTitle,
        text: "Your project is approved",
      };
      transporter.sendMail(mailOptions, (err, info) => {
        console.log(err);
      });
    });
  }
  res.status(200).send();
});
app.post("/submitProject", authenticate, async (req, res) => {
  await ProjectModel.updateOne(
    {
      _id: ObjectId(req.body._id),
      "submittedData.email": { $eq: req.body.email },
    },
    {
      $set: {
        "submittedData.$": {
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
        },
      },
    }
  );
  res.status(200).send();
});
app.post("/rejectproject", authenticate, async (req, res) => {
  await ProjectModel.updateOne(
    {
      _id: ObjectId(req.body._id),
      "submittedData.email": { $eq: req.body.email },
    },
    {
      $pull: {
        submittedData: {
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
        },
      },
    }
  ).then(() => {
    const mailOptions = {
      from: "managemyworkhere@gmail.com",
      to: req.body.email, //change afterwards
      subject: req.body.projectTitle,
      text: "Your project is rejected. Please change the project title",
    };
    transporter.sendMail(mailOptions, (err, info) => {
      console.log(err);
    });
  });
  res.status(200).send();
});
app.post("/deletegroup", authenticate, async (req, res) => {
  console.log("GROUP ID RECEIVED");
  console.log(req.body._id);
  (await UserModel.find()).forEach(async (doc) => {
    await UserModel.updateOne(
      { _id: doc._id },
      { $pull: { data: ObjectId(req.body._id) } }
    ).then(console.log("deleted one record"));
  });

  await ProjectModel.deleteOne({ _id: ObjectId(req.body._id) }).then(
    console.log("deleted from projects")
  );

  res.status(200).send();
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Server started");
});

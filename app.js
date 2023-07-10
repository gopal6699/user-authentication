const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const path = require("path");
const dbPath = path.join(__dirname, "userData.db");

let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
  }
};

initializeDBAndServer();

//User register API
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const checkUsernameQuery = `
    SELECT
        *
    FROM
        user
    WHERE
        username = '${username}'`;
  let dbUser = await db.get(checkUsernameQuery);
  if (dbUser === undefined) {
    //create user
    let hashedPassword = await bcrypt.hash(password, 10);
    const createNewUserQuery = `
        INSERT INTO
            user(username, name, password, gender, location)
        VALUES
            ('${username}', 
            '${name}', 
            '${hashedPassword}', 
            '${gender}', 
            '${location}')`;
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      await db.run(createNewUserQuery);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//User login API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `
  SELECT
        *
    FROM
        user
    WHERE
        username = '${username}'`;
  let userDetails = await db.get(getUserQuery);
  if (userDetails === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    let isPasswordMatched = await bcrypt.compare(
      password,
      userDetails.password
    );
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//Change password API
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const getUserQuery = `
  SELECT
        *
    FROM
        user
    WHERE
        username = '${username}'`;
  let dbUser = await db.get(getUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password);
    if (isValidPassword === true) {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const encryptedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
        UPDATE
            user
        SET
            password = '${encryptedPassword}'
        WHERE username = '${username}'`;
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;

require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const admin = require("firebase-admin");

let serviceAccount = require("./fire-and-ice-adminsdk-key.json");

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASEURL
});

// As an admin, the app has access to read and write all data, regardless of Security Rules
let db = admin.firestore();

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Check to see is Authentication is present
app.use((req, res, next) => {
  if (!req.header("X-Auth-Token")) {
    return res.status(403).json({ error: "No auth token sent!" });
  }
  next();
});

// handle a POST request to consume Raspi sensor data and write to Firebase Cloud Firestore
app.post("/sensor", (req, res, next) => {
  // Firebase Cloud Firestore code
  const sensors = db.collection("sensorMeta");
  const sensorRef = db.collection("sensorData");

  // Check to see if valu Authentication Key presented, if so commit measurements to Cloud Firestore DB
  checkAuth = sensors
    .where("sensorKey", "==", req.header("X-Auth-Token"))
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        console.log("No matching documents.");
        res.status(500).json({ error: "invalid auth token!" });
        return;
      } else {
        sensorRef
          .add({
            sensorKey: req.header("X-Auth-Token"),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            temp: req.body.temperature,
            humidity: req.body.humidity
          })
          .then(ref => {
            console.log(
              `Added document with ID: , ${ref.id}, Sensor: ${req.header("X-Auth-Token")}, Temperature ${
                req.body.temperature
              }, Humidity: ${req.body.humidity}`
            );
            res.status(200).json({ message: "success" });
            return;
          })
          .catch(err => {
            console.log("Error writing document", err);
          });
      }
    })
    .catch(err => {
      console.log("Error getting documents", err);
    });
});

app.listen(process.env.PORT || 3000);

console.log("Server listening on port 3000...");

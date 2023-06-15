const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

// mongoDB

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.krjt8gu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const classCollection = client.db("rhythmaxDB").collection("classes");
    const userCollection = client.db("rhythmaxDB").collection("users");
    const bookingCollection = client.db("rhythmaxDB").collection("bookings");

    // user
    app.get("/users", verifyJWT, async (req, res) => {
      let query = {};
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // class
    app.get("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
      res.send(result);
    });

    app.get("/classes", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { instructorEmail: req.query?.email };
      }
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/class", verifyJWT, async (req, res) => {
      const classes = req.body;
      const result = await classCollection.insertOne(classes);
      res.send(result);
    });

    app.post("/jwtANDusers", async (req, res) => {
      const u = req.body;

      const query = { email: u.email };
      let user = await userCollection.findOne(query);
      if (!user && u?.insert) {
        delete u.insert;
        let status = await userCollection.insertOne(u);
        user = await userCollection.findOne(query);
      }
      if (user) {
        let token = jwt.sign(
          { email: u.email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "1d" }
        );
        let role = user.role;
        return res.send({ token, role });
      }
      res.send({});
    });

    // update classes
    app.put("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateClass = req.body;
      const classUpdate = {
        $set: {
          className: updateClass.className,
          photo: updateClass.photo,
          seats: updateClass.seats,
          price: updateClass.price,
        },
      };
      const result = await classCollection.updateOne(
        filter,
        classUpdate,
        options
      );
      res.send(result);
    });

    // update makeinstructor
    app.put("/makeinstructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateInstructor = req.body;
      const instructor = {
        $set: {
          role: updateInstructor.role,
        },
      };
      const result = await userCollection.updateOne(
        filter,
        instructor,
        options
      );
      res.send(result);
    });


    // bookings
    app.get('/bookings', async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result);
    })

    /* bookings api for select btn */
    app.post("/bookings", async (req, res) => {
      const bookings = req.body;
      console.log(bookings);
      const result = await bookingCollection.insertOne(bookings);
      res.send(result);
    });

    // delete for class
    app.delete("/classes/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.deleteOne(query);
      res.send(result);
    });

    // delete for user
    app.delete("/users/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });


    /* bookings delete api */
    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Rhythmax is running ...");
});

app.listen(port, () => {
  console.log(`Rhythmax server is running on port: ${port}`);
});

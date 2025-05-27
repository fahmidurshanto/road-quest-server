const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();


app.use(cors({
  origin: ["http://localhost:5173"],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}))
app.use(express.json());





const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.p5ldir2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const db = client.db("road-quest");
const carsCollection = db.collection("cars");
const usersCollection = db.collection("users");
const bookingsCollection = db.collection("bookings");


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    app.get("/", async (req, res) =>{
      res.send("Road Quest Server is running...")
    })

    app.post("/my-cars", async (req, res) => {
      const car = req.body;
      
      // Insert into my-cars collection (with email)
      carsCollection.insertOne({
        ...car,
        collection: 'my-cars'  // Add a flag to identify the collection
      })
      .then(myCarsResult => {
        // Insert into cars collection (without email)
        return carsCollection.insertOne({
          ...car,
          collection: 'cars'  // Add a flag to identify the collection
        })
        .then(carsResult => {
          res.send({
            myCarsResult,
            carsResult,
            message: "Car added successfully to both collections"
          });
        });
      })
      .catch(error => {
        console.error("Error adding car:", error);
        res.status(500).send({ error: "Failed to add car" });
      });
    });

   app.get("/cars", async (req, res) => {
    const result = await carsCollection.find({ collection: 'cars' }).toArray();
    console.log(result)
    res.send(result);
   })

    app.get("/my-cars", async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
        collection: 'my-cars'
      };
      const result = await carsCollection.find(query).toArray();
      res.send(result);
    })

    app.get("/available-cars", async (req, res) =>{
      const availability = req.query.availability;
      console.log(availability)
      const query = {availability : "available" && availability};
      const result = await carsCollection.find(query).toArray();
      res.send(result);
    })

    app.get("/available-cars/:id", async  (req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await carsCollection.findOne(query);
      res.send(result);
    })




        // Get single car by ID
app.get("/my-cars/:id", (req, res) => {
  const id = req.params.id;

  // Validate MongoDB ID format
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ error: "Invalid car ID format" });
  }

  carsCollection.findOne({ _id: new ObjectId(id) })
    .then(car => {
      if (!car) {
        return res.status(404).send({ error: "Car not found" });
      }
      res.send(car);
    })
    .catch(error => {
      console.error("Fetch error:", error);
      res.status(500).send({ error: "Server error fetching car" });
    });
});

    app.put("/my-cars/:id", (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      
      // Validate MongoDB ID format first
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid car ID format" });
      }
    
      // Prepare update fields
      const updateFields = {};
      for (const key in updatedData) {
        if (key !== '_id' && key !== 'user') {
          updateFields[`carData.${key}`] = updatedData[key];
        }
      }
    
      // Update operation
      carsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateFields }
      )
      .then(result => {
        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Car not found" });
        }
        res.send({ 
          message: "Car updated successfully",
          updatedCount: result.modifiedCount
        });
      })
      .catch(error => {
        console.error("Update error:", error);
        res.status(500).send({ error: "Server error during update" });
      });
    });

    // Delete car by ID
app.delete("/my-cars/:id", (req, res) => {
  const id = req.params.id;

  // Validate MongoDB ID format first
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ error: "Invalid car ID format" });
  }

  carsCollection.deleteOne({ _id: new ObjectId(id) })
    .then(result => {
      if (result.deletedCount === 0) {
        return res.status(404).send({ error: "Car not found" });
      }
      res.send({ 
        message: "Car deleted successfully",
        deletedCount: result.deletedCount
      });
    })
    .catch(error => {
      console.error("Delete error:", error);
      res.status(500).send({ error: "Server error during deletion" });
    });
});

app.post("/my-bookings", (req, res) => {
  const booking = req.body;
  
  // First create the booking
  bookingsCollection.insertOne(booking)
    .then(bookingResult => {
      // Then increment the booking count for the car
      return carsCollection.updateOne(
        { _id: new ObjectId(booking.carId) },
        { $inc: { bookingCount: 1 } }
      )
      .then(updateResult => {
        res.status(201).send({
          booking: bookingResult,
          updateResult,
          message: "Booking created and car booking count updated successfully"
        });
      });
    })
    .catch(error => {
      console.error("Error creating booking:", error);
      res.status(500).send({ error: "Failed to create booking" });
    });
});

app.get("/my-bookings", (req, res) => {
  const email = req.query.email;
  
  // Validate email parameter
  if (!email) {
    return res.status(400).send({ error: "Email parameter is required" });
  }

  const query = { email: email };
  
  bookingsCollection.find(query)
    .toArray()
    .then(result => {
      if (!result || result.length === 0) {
        return res.status(404).send({ message: "No bookings found for this email" });
      }
      res.status(200).send(result);
    })
    .catch(error => {
      console.error("Error fetching bookings:", error);
      res.status(500).send({ error: "Failed to fetch bookings" });
    });
});

app.get("/cars/:id/booking-count", (req, res) => {
  const carId = req.params.id;

  if (!ObjectId.isValid(carId)) {
    return res.status(400).send({ error: "Invalid car ID format" });
  }

  carsCollection.findOne(
    { _id: new ObjectId(carId) },
    { projection: { bookingCount: 1 } }
  )
    .then(car => {
      if (!car) {
        return res.status(404).send({ error: "Car not found" });
      }
      res.status(200).send({ 
        carId,
        bookingCount: car.bookingCount || 0 
      });
    })
    .catch(error => {
      console.error("Error fetching booking count:", error);
      res.status(500).send({ error: "Failed to fetch booking count" });
    });
});

app.patch("/bookings/:id", async (req, res) => {
  const { id } = req.params;
  const updatesFromBody = req.body; // Contains fields like { status: 'canceled' } or { bookingDate, endDate, totalPrice }

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ error: "Invalid booking ID format" });
  }

  const fieldsToUpdate = {};

  // Whitelist and format fields that can be updated
  if (updatesFromBody.status) {
    fieldsToUpdate.status = updatesFromBody.status;
  }
  if (updatesFromBody.bookingDate) {
    const parsedBookingDate = new Date(updatesFromBody.bookingDate);
    if (isNaN(parsedBookingDate.getTime())) {
        return res.status(400).send({ error: "Invalid bookingDate format." });
    }
    fieldsToUpdate.bookingDate = parsedBookingDate;
  }
  if (updatesFromBody.endDate) {
    const parsedEndDate = new Date(updatesFromBody.endDate);
    if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).send({ error: "Invalid endDate format." });
    }
    fieldsToUpdate.endDate = parsedEndDate;
  }
  if (updatesFromBody.totalPrice !== undefined) { // Check for undefined because totalPrice could be 0
    fieldsToUpdate.totalPrice = parseFloat(updatesFromBody.totalPrice);
    if (isNaN(fieldsToUpdate.totalPrice)) {
        return res.status(400).send({ error: "Invalid totalPrice format. Must be a number." });
    }
  }

  // Basic validation: If both dates are being updated, ensure endDate is after bookingDate
  const finalBookingDate = fieldsToUpdate.bookingDate || (await bookingsCollection.findOne({_id: new ObjectId(id)}))?.bookingDate;
  const finalEndDate = fieldsToUpdate.endDate || (await bookingsCollection.findOne({_id: new ObjectId(id)}))?.endDate;

  if (finalBookingDate && finalEndDate && new Date(finalEndDate) < new Date(finalBookingDate)) {
      return res.status(400).send({ error: "End date cannot be before start date." });
  }

  if (Object.keys(fieldsToUpdate).length === 0) {
    return res.status(400).send({ error: "No valid update fields provided" });
  }

  fieldsToUpdate.lastModified = new Date(); // Add a last modified timestamp

  try {
    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: fieldsToUpdate }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "Booking not found" });
    }

    if (result.modifiedCount === 0 && result.matchedCount === 1) {
        // Document found, but no actual changes made by the update operation
        const existingBooking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
        return res.status(200).send({
          message: "Booking found, but no changes were applied (data might be the same).",
          booking: existingBooking
        });
    }

    // Fetch the updated document to return it
    const updatedBooking = await bookingsCollection.findOne({ _id: new ObjectId(id) });

    res.status(200).send({
        message: "Booking updated successfully",
        booking: updatedBooking
    });

  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).send({ error: "Failed to update booking" });
  }
});

    app.listen(port, () =>{
      console.log(`Road Quest Server is running on port ${port}`)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


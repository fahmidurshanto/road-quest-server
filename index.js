const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

app.use(cors({
  origin: ["https://road-quest-client.vercel.app"],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}))
app.use(express.json());
app.use(cookieParser())





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


    // auth related api
    app.post("/jwt", async (req, res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {expiresIn: "1h"});
      res.cookie("token", token, {httpOnly: true, secure: false, sameSite: ""})
      res.send({success: true})
    })

    app.post("/my-cars", async (req, res) => {
      const car = req.body;
      console.log(req.cookies)
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
      console.log(req.cookies)
      const result = await carsCollection.find(query).toArray();
      res.send(result);
    })

    app.get("/available-cars", async (req, res) =>{
      const availability = req.query.availability;
      console.log(req.cookies)
      const query = {availability : "available"};
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
  
  bookingsCollection.insertOne(booking)
    .then(bookingResult => {
      return carsCollection.updateOne(
        { 
          _id: new ObjectId(booking.carId),
          collection: 'cars' // Add this filter
        },
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



app.patch("/bookings/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Validate booking ID
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ error: "Invalid booking ID format" });
  }

  try {
    // 1. Fetch existing booking
    const existingBooking = await bookingsCollection.findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!existingBooking) {
      return res.status(404).send({ error: "Booking not found" });
    }

    // 2. Prepare update fields
    const updateFields = { lastModified: new Date() };
    let needsAvailabilityCheck = false;
    let newStart = existingBooking.bookingDate;
    let newEnd = existingBooking.endDate;

    // 3. Handle date updates
    if (updates.bookingDate || updates.endDate) {
      needsAvailabilityCheck = true;
      
      // Parse new dates
      newStart = updates.bookingDate ? new Date(updates.bookingDate) : existingBooking.bookingDate;
      newEnd = updates.endDate ? new Date(updates.endDate) : existingBooking.endDate;

      // Validate date types
      if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
        return res.status(400).send({ error: "Invalid date format" });
      }

      // Validate date logic
      if (newEnd <= newStart) {
        return res.status(400).send({ 
          error: "End date must be after start date" 
        });
      }

      // Add to update fields
      updateFields.bookingDate = newStart;
      updateFields.endDate = newEnd;
    }

    // 4. Handle price updates
    if (updates.totalPrice !== undefined) {
      updateFields.totalPrice = parseFloat(updates.totalPrice);
      if (isNaN(updateFields.totalPrice)) {
        return res.status(400).send({ error: "Invalid price format" });
      }
    }

    // 5. Handle status updates
    if (updates.status) {
      updateFields.status = updates.status;
    }

    // 6. Check for availability conflicts (only if dates changed)
    if (needsAvailabilityCheck) {
      // Convert to ISO strings for accurate comparison
      const isoStart = newStart.toISOString();
      const isoEnd = newEnd.toISOString();
      
      const overlappingBooking = await bookingsCollection.findOne({
        carId: existingBooking.carId,
        status: { $in: ["confirmed", "pending"] },
        _id: { $ne: new ObjectId(id) },
        $or: [
          // Existing booking overlaps with new start date
          { 
            bookingDate: { $lte: isoEnd },
            endDate: { $gte: isoStart }
          },
          // New booking completely contains existing booking
          { 
            bookingDate: { $gte: isoStart },
            endDate: { $lte: isoEnd }
          }
        ]
      });

      if (overlappingBooking) {
        // Format dates for better readability
        const formatDate = (date) => date.toISOString().split('T')[0];
        
        return res.status(409).send({
          error: "Car not available for selected dates",
          conflict: {
            message: `Already booked from ${formatDate(overlappingBooking.bookingDate)} to ${formatDate(overlappingBooking.endDate)}`,
            existingStart: overlappingBooking.bookingDate,
            existingEnd: overlappingBooking.endDate
          }
        });
      }
    }

    // 7. Perform the update
    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "Booking not found during update" });
    }

    // 8. Return updated booking
    const updatedBooking = await bookingsCollection.findOne({ 
      _id: new ObjectId(id) 
    });

    res.status(200).send({ 
      message: "Booking updated successfully",
      booking: updatedBooking 
    });

  } catch (error) {
    console.error("Booking modification error:", error);
    res.status(500).send({ 
      error: "Internal server error",
      details: error.message 
    });
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


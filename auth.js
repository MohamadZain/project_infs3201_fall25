// auth.js
// -----------------------------------------------------------
// This file handles user registration and login using MongoDB
// with hashed passwords (SHA256 + salt).
//
// HOW TO USE:
// 1. Replace the value of `MONGODB_URI` below with your 
//    MongoDB Compass connection string.
//
// -----------------------------------------------------------

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// --- ADD YOUR MONGODB COMPASS LINK HERE ---
const MONGODB_URI = 'mongodb+srv://student:12class34@cluster1.sjh42tn.mongodb.net/'
const dbName = 'infs3201_fall2025'; // database name
const client = new MongoClient(MONGODB_URI);

let db, userCollection;

// --- Connect to DB ---
async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db(dbName);
        userCollection = db.collection('users'); // main users collection
    }
}

// --- Helper: hash password with salt using SHA256 ---
function hashPassword(password, salt) {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// --- Verify user login ---
async function verifyUser(username, password) {
    await connectDB();
    const user = await userCollection.findOne({ username });
    if (!user) return null;

    const hashed = hashPassword(password, user.salt);
    return hashed === user.password ? user : null;
}

// --- Register new user ---
// --- Register new user (ownerId = 1,2,3... auto-increment) ---
async function registerUser(name, email, username, password) {
    await connectDB();

    // Check if username already exists
    const existing = await userCollection.findOne({ username: username });
    if (existing) {
        return { success: false, message: 'Username already exists' };
    }

    // --- Generate incremental ownerID (Level 1 style) ---
    const counterColl = db.collection('counters');
    let counterDoc = await counterColl.findOne({ _id: 'ownerID' });

    let ownerID;
    if (counterDoc && counterDoc.seq) {
        // Counter exists, increment it
        ownerID = counterDoc.seq + 1;
        await counterColl.updateOne(
            { _id: 'ownerID' },
            { $set: { seq: ownerID } }
        );
    } else {
        // Counter missing or no seq, find max ownerID in users
        const allUsers = await userCollection.find().toArray();
        let maxID = 0;
        for (let i = 0; i < allUsers.length; i++) {
            if (allUsers[i].ownerID > maxID) {
                maxID = allUsers[i].ownerID;
            }
        }
        ownerID = maxID + 1;

        // Initialize counter
        await counterColl.updateOne(
            { _id: 'ownerID' },
            { $set: { seq: ownerID } },
            { upsert: true }
        );
    }

    // --- Hash password ---
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = hashPassword(password, salt);

    // --- Create new user ---
    const newUser = {
        name: name,
        email: email,
        username: username,
        password: hashedPassword,
        salt: salt,
        ownerID: ownerID,
    };

    await userCollection.insertOne(newUser);

    return { success: true, message: 'User registered successfully' };
}

module.exports = { verifyUser, registerUser };

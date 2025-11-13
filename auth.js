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
const MONGODB_URI = 'mongodb+srv://student:12class34@cluster0.abcde.12class34.net/infs3201_fall2025?retryWrites=true&w=majority';
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
async function registerUser(name, email, username, password) {
    await connectDB();

    const existing = await userCollection.findOne({ username });
    if (existing) {
        return { success: false, message: 'Username already exists' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = hashPassword(password, salt);

    const newUser = {
        name,
        email,
        username,
        password: hashedPassword,
        salt
    };

    await userCollection.insertOne(newUser);
    return { success: true, user: newUser };
}

module.exports = { verifyUser, registerUser };

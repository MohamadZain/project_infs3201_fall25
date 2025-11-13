const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://student:12class34@cluster1.sjh42tn.mongodb.net/';
const client = new MongoClient(uri);
const dbName = 'infs3201_fall2025';
let db, userCollection;

async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db(dbName);
        userCollection = db.collection('users_temp'); // ← your temp users
    }
}

async function verifyUser(username, password) {
    await connectDB();
    return await userCollection.findOne({ username, password }); // plain-text match
}

async function registerUser(username, password) {
    await connectDB();
    const existing = await userCollection.findOne({ username });
    if (existing) return { success: false, message: 'Username exists' };
    const newUser = { username, password };
    await userCollection.insertOne(newUser);
    return { success: true, user: newUser };
}

module.exports = { verifyUser, registerUser };

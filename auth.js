// auth.js

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const MONGODB_URI = 'mongodb+srv://student:12class34@cluster1.sjh42tn.mongodb.net/';
const dbName = 'infs3201_fall2025';
const client = new MongoClient(MONGODB_URI);

let db, userCollection;

/**
 * Connect to MongoDB if not already connected.
 */
async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db(dbName);
        userCollection = db.collection('users');
    }
}

/**
 * Hash a password with a given salt using SHA256.
 * @param {string} password - The password to hash
 * @param {string} salt - The salt to use
 * @returns {string} The hashed password
 */
function hashPassword(password, salt) {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

/**
 * Verify user login credentials.
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object|null>} User object if valid, else null
 */
async function verifyUser(username, password) {
    await connectDB();
    const user = await userCollection.findOne({ username });
    if (!user) return null;

    const hashed = hashPassword(password, user.salt);
    return hashed === user.password ? user : null;
}

/**
 * Register a new user with auto-incremented ownerID.
 * @param {string} name - Full name
 * @param {string} email - Email address
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} Success status and message
 */
async function registerUser(name, email, username, password) {
    await connectDB();

    // Check for existing username
    const existing = await userCollection.findOne({ username });
    if (existing) {
        return { success: false, message: 'Username already exists' };
    }

    // Generate incremental ownerID
    const counterColl = db.collection('counters');
    let counterDoc = await counterColl.findOne({ _id: 'ownerID' });

    let ownerID;
    if (counterDoc && counterDoc.seq) {
        ownerID = counterDoc.seq + 1;
        await counterColl.updateOne({ _id: 'ownerID' }, { $set: { seq: ownerID } });
    } else {
        const allUsers = await userCollection.find().toArray();
        let maxID = 0;
        for (let i = 0; i < allUsers.length; i++) {
            if (allUsers[i].ownerID > maxID) {
                maxID = allUsers[i].ownerID;
            }
        }
        ownerID = maxID + 1;

        await counterColl.updateOne({ _id: 'ownerID' }, { $set: { seq: ownerID } }, { upsert: true });
    }

    // Hash the password
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = hashPassword(password, salt);

    // Create user
    const newUser = {
        name,
        email,
        username,
        password: hashedPassword,
        salt,
        ownerID,
    };

    await userCollection.insertOne(newUser);

    return { success: true, message: 'User registered successfully' };
}

module.exports = { verifyUser, registerUser };

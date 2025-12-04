// auth.js
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// MongoDB connection URI and database name
const MONGODB_URI = 'mongodb+srv://student:12class34@cluster1.sjh42tn.mongodb.net/';
const dbName = 'infs3201_fall2025';
const client = new MongoClient(MONGODB_URI);

let db, userCollection;

// Connect to MongoDB and initialize the users collection
async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db(dbName);
        userCollection = db.collection('users');
    }
}

// Hash a password using SHA-256 with a given salt
function hashPassword(password, salt) {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// Verify a user's credentials
async function verifyUser(username, password) {
    await connectDB();
    const user = await userCollection.findOne({ username });
    if (!user) return null;

    const hashed = hashPassword(password, user.salt);
    return hashed === user.password ? user : null; // return user if password matches
}

// Register a new user
async function registerUser(name, email, username, password) {
    await connectDB();

    // Check if username already exists
    const existing = await userCollection.findOne({ username });
    if (existing) return { success: false, message: 'Username already exists' };

    // Get the current ownerID counter
    const counterColl = db.collection('counters');
    let counterDoc = await counterColl.findOne({ _id: 'ownerID' });

    let ownerID;
    if (counterDoc && counterDoc.seq) {
        // Increment counter if it exists
        ownerID = counterDoc.seq + 1;
        await counterColl.updateOne({ _id: 'ownerID' }, { $set: { seq: ownerID } });
    } else {
        // Calculate max ownerID from existing users if counter doesn't exist
        const allUsers = await userCollection.find().toArray();
        let maxID = 0;
        for (let i = 0; i < allUsers.length; i++) {
            if (allUsers[i].ownerID > maxID) maxID = allUsers[i].ownerID;
        }
        ownerID = maxID + 1;
        await counterColl.updateOne({ _id: 'ownerID' }, { $set: { seq: ownerID } }, { upsert: true });
    }

    // Generate a new salt and hash the password
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = hashPassword(password, salt);

    // Create new user document
    const newUser = {
        name,
        email,
        username,
        password: hashedPassword,
        salt,
        ownerID,
    };

    // Insert new user into the collection
    await userCollection.insertOne(newUser);
    return { success: true, message: 'User registered successfully', user: newUser };
}

// Change a user's password
async function changePassword(username, currentPassword, newPassword) {
    await connectDB();

    const user = await userCollection.findOne({ username });
    if (!user) return false;

    // Verify current password
    const hashedCurrent = hashPassword(currentPassword, user.salt);
    if (hashedCurrent !== user.password) return false;

    // Generate new salt and hash new password
    const newSalt = crypto.randomBytes(16).toString('hex');
    const hashedNew = hashPassword(newPassword, newSalt);

    // Update user document with new password and salt
    await userCollection.updateOne(
        { username },
        { $set: { password: hashedNew, salt: newSalt } }
    );

    return true;
}

/**
 * New helper: get user by ownerID
 */
async function getUserByID(ownerID) {
    await connectDB();
    return await userCollection.findOne({ ownerID });
}

// Export functions for external use
module.exports = { verifyUser, registerUser, changePassword, getUserByID };

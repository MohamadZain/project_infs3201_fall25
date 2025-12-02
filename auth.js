// auth.js
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const MONGODB_URI = 'mongodb+srv://student:12class34@cluster1.sjh42tn.mongodb.net/';
const dbName = 'infs3201_fall2025';
const client = new MongoClient(MONGODB_URI);

let db, userCollection;

async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db(dbName);
        userCollection = db.collection('users');
    }
}

function hashPassword(password, salt) {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

async function verifyUser(username, password) {
    await connectDB();
    const user = await userCollection.findOne({ username });
    if (!user) return null;
    const hashed = hashPassword(password, user.salt);
    return hashed === user.password ? user : null;
}

async function registerUser(name, email, username, password) {
    await connectDB();

    const existing = await userCollection.findOne({ username });
    if (existing) return { success: false, message: 'Username already exists' };

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
            if (allUsers[i].ownerID > maxID) maxID = allUsers[i].ownerID;
        }
        ownerID = maxID + 1;
        await counterColl.updateOne({ _id: 'ownerID' }, { $set: { seq: ownerID } }, { upsert: true });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = hashPassword(password, salt);

    const newUser = {
        name,
        email,
        username,
        password: hashedPassword,
        salt,
        ownerID,
    };

    await userCollection.insertOne(newUser);
    return { success: true, message: 'User registered successfully', user: newUser };
}

async function changePassword(username, currentPassword, newPassword) {
    await connectDB();

    const user = await userCollection.findOne({ username });
    if (!user) return false;

    const hashedCurrent = hashPassword(currentPassword, user.salt);
    if (hashedCurrent !== user.password) return false;

    const newSalt = crypto.randomBytes(16).toString('hex');
    const hashedNew = hashPassword(newPassword, newSalt);

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

module.exports = { verifyUser, registerUser, changePassword, getUserByID };

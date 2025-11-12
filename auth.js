const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const uri = 'mongodb+srv://student:12class34@cluster1.sjh42tn.mongodb.net/'; // Change if needed
const dbName = 'infs3201_fall2025';            // Adjust to your DB name
const client = new MongoClient(uri);

// Helper: Hash password with a given salt
function hashPassword(password, salt) {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

async function getCollection() {
    await client.connect();
    const db = client.db(dbName);
    return db.collection('users');
}

// --- REGISTER USER ---
async function registerUser(name, email, username, password) {
    const users = await getCollection();

    const existing = await users.findOne({ username });
    if (existing) {
        return { success: false, message: 'Username already exists.' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = hashPassword(password, salt);

    const user = {
        name,
        email,
        username,
        password: hashedPassword,
        salt,
        createdAt: new Date()
    };

    await users.insertOne(user);

    return { success: true, user };
}

// --- VERIFY USER (LOGIN) ---
async function verifyUser(username, password) {
    const users = await getCollection();

    const user = await users.findOne({ username });
    if (!user) return null;

    // Handle old users without salt (optional migration)
    if (!user.salt) {
        // If the stored password matches plaintext
        if (user.password === password) {
            const newSalt = crypto.randomBytes(16).toString('hex');
            const newHashed = hashPassword(password, newSalt);

            await users.updateOne(
                { username },
                { $set: { password: newHashed, salt: newSalt } }
            );

            user.password = newHashed;
            user.salt = newSalt;
        } else {
            // Password doesn't match even plaintext
            return null;
        }
    }

    const hashedInput = hashPassword(password, user.salt);
    if (hashedInput === user.password) {
        return user;
    }

    return null;
}

module.exports = { registerUser, verifyUser };
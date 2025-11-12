// auth.js
const fs = require('fs/promises');
const path = require('path');

// Path to users.json
const USERS_FILE = path.join(__dirname, 'users.json');

// Load users from file
async function loadUsers() {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data);
}

// Save users to file
async function saveUsers(users) {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// === LOGIN ===
async function verifyUser(username, password) {
    const users = await loadUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
        return null; // user not found
    }

    if (user.password === password) {
        return { id: user.id, username: user.username };
    }

    return null; // wrong password
}

// === REGISTER ===
async function registerUser(name, email, username, password) {
    const users = await loadUsers();

    // Check if username or email already exists
    const exists = users.some(u => u.username === username || u.email === email);
    if (exists) {
        return { success: false, message: 'Username or email already taken' };
    }

    // Create new user
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;

    const newUser = {
        id: newId,
        name: name,
        email: email,
        username: username,
        password: password   // plain text (as requested)
    };

    users.push(newUser);
    await saveUsers(users);

    return {
        success: true,
        user: { id: newId, username: username }
    };
}

module.exports = { verifyUser, registerUser };
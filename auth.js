const fs = require('fs/promises')
const path = require('path')

const usersFile = path.join(__dirname, 'users.json')

// Read all users from the JSON file
async function getAllUsers() {
    try {
        const data = await fs.readFile(usersFile, 'utf-8')
        return JSON.parse(data)
    } catch (err) {
        return []
    }
}

// Verify user login credentials
async function verifyUser(username, password) {
    const users = await getAllUsers()
    return users.find(u => u.username === username && u.password === password)
}

// Register a new user
async function registerUser(name, email, username, password) {
    const users = await getAllUsers()
    
    // Check if username or email already exists
    if (users.some(u => u.username === username || u.email === email)) {
        return { success: false, message: 'Username or email already exists' }
    }

    const newUser = {
        id: users.length > 0 ? users[users.length - 1].id + 1 : 1,
        name,
        email,
        username,
        password
    }
    users.push(newUser)

    await fs.writeFile(usersFile, JSON.stringify(users, null, 2))
    return { success: true, user: newUser }
}

module.exports = {
    getAllUsers,
    verifyUser,
    registerUser
}

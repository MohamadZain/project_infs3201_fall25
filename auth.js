const fs = require('fs/promises')
const path = require('path')

const usersFile = path.join(__dirname, 'users.json')

async function getAllUsers() {
    try {
        const data = await fs.readFile(usersFile, 'utf-8')
        return JSON.parse(data)
    } catch (err) {
        return []
    }
}

async function verifyUser(username, password) {
    const users = await getAllUsers()
    const user = users.find(u => u.username === username && u.password === password)
    
    if (user) {
        return {
            id: user.id,
            username: user.username
        }
    }
    return null
}

async function registerUser(name, email, username, password) {
    const users = await getAllUsers()
    
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
    
    return { 
        success: true, 
        user: { 
            id: newUser.id, 
            username: newUser.username 
        } 
    }
}

module.exports = {
    getAllUsers,
    verifyUser,
    registerUser
}
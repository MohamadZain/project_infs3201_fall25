// webapp.js
const express = require('express')
const handlebars = require('express-handlebars')
const crypto = require('crypto')

const business = require('./business')
const auth = require('./auth')

const app = express()

// --- Handlebars setup ---
app.set('views', __dirname + "/templates")
app.set('view engine', 'hbs')
app.engine('hbs', handlebars.engine())

// --- Middleware ---
app.use(express.urlencoded({ extended: true }))
app.use('/static', express.static(__dirname + "/static"))
app.use('/photos', express.static(__dirname + "/photos"))

// --- In-memory login store ---
const loggedInUsers = {}  // Key: sessionID, Value: user object

// --- Manual cookie parser ---
function parseCookies(req) {
    const list = {}
    const rc = req.headers.cookie
    if (!rc) return list

    rc.split(';').forEach(cookie => {
        const parts = cookie.split('=')
        list[parts.shift().trim()] = decodeURIComponent(parts.join('='))
    })
    return list
}

// --- Middleware to check login ---
function ensureLogin(req, res, next) {
    const cookies = parseCookies(req)
    const sessionID = cookies.sessionID
    if (!sessionID || !loggedInUsers[sessionID]) {
        return res.redirect('/login')
    }
    req.user = loggedInUsers[sessionID]
    next()
}

// --- Homepage ---
app.get('/', ensureLogin, async (req, res) => {
    let albumList = await business.getAlbums()
    res.render('index', { albums: albumList, user: req.user, layout: undefined })
})

// --- Login Routes ---
app.get('/login', (req, res) => {
    res.render('login', { layout: undefined })
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body
    const user = await auth.verifyUser(username, password)
    if (user) {
        const sessionID = crypto.randomUUID()
        loggedInUsers[sessionID] = user
        res.setHeader('Set-Cookie', `sessionID=${sessionID}; HttpOnly`)
        res.redirect('/')
    } else {
        res.render('login', { error: 'Invalid username or password', layout: undefined })
    }
})

// --- Logout Route ---
app.get('/logout', (req, res) => {
    const cookies = parseCookies(req)
    const sessionID = cookies.sessionID
    if (sessionID) delete loggedInUsers[sessionID]
    res.setHeader('Set-Cookie', 'sessionID=; Max-Age=0') // clear cookie
    res.redirect('/login')
})

// --- Register Routes ---
app.get('/register', (req, res) => {
    res.render('register', { layout: undefined })
})

app.post('/register', async (req, res) => {
    const { name, email, username, password } = req.body
    const result = await auth.registerUser(name, email, username, password)
    if (result.success) {
        const sessionID = crypto.randomUUID()
        loggedInUsers[sessionID] = result.user
        res.setHeader('Set-Cookie', `sessionID=${sessionID}; HttpOnly`)
        res.redirect('/')
    } else {
        res.render('register', { error: result.message, layout: undefined })
    }
})

// --- Album & Photo Routes ---
app.get('/album/:aid', ensureLogin, async (req, res) => {
    let albumId = Number(req.params.aid)
    let albumDetails = await business.getAlbumDetails(albumId)
    let visiblePhotos = await business.getPhotosInAlbum(albumId, req.user)

    res.render('album', { 
        album: albumDetails, 
        photos: visiblePhotos, 
        count: visiblePhotos.length,
        user: req.user, 
        layout: undefined 
    })
})

app.get('/photo-details/:pid', ensureLogin, async (req, res) => {
    let photoId = Number(req.params.pid)
    let photoDetails = await business.getPhotoDetails(photoId)

    if (photoDetails && photoDetails.visibility === "private" && photoDetails.ownerID !== req.user.ownerID) {
        return res.send("This photo is private.")
    }

    if (!photoDetails) {
        return res.send("Photo not found.")
    }

    res.render('view_photo', { photo: photoDetails, user: req.user, layout: undefined })
})

app.get('/edit-photo', ensureLogin, async (req, res) => {
    let photoId = Number(req.query.pid)
    let photoDetails = await business.getPhotoDetails(photoId)

    if (photoDetails.ownerID !== req.user.ownerID) {
        return res.send('You are not allowed to edit this photo')
    }

    // Set default visibility
    let visibility = "private"
    if (photoDetails.visibility === "public") visibility = "public"
    else if (!photoDetails.visibility) visibility = "public"

    // Set select options
    let selectPrivate = ""
    let selectPublic = ""
    if (visibility === "private") selectPrivate = "selected"
    else selectPublic = "selected"

    photoDetails.selectPrivate = selectPrivate
    photoDetails.selectPublic = selectPublic

    res.render('edit_photo', { photo: photoDetails, user: req.user.username, layout: undefined })
})

app.post('/edit-photo', ensureLogin, async (req, res) => {
    let photoId = Number(req.body.id)
    let photoDetails = await business.getPhotoDetails(photoId)

    if (photoDetails.ownerID !== req.user.ownerID) {
        return res.send('You are not allowed to edit this photo')
    }

    let title = req.body.title
    let description = req.body.description
    let visibility = req.body.visibility

    await business.updatePhoto(photoId, title, description, visibility)
    res.redirect(`/photo-details/${photoId}`)
})

// --- Start server ---
app.listen(8000, () => {
    console.log('Server started on port 8000')
})

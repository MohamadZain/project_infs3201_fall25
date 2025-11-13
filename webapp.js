const express = require('express')
const handlebars = require('express-handlebars')
const crypto = require('crypto')

const business = require('./business')
const auth = require('./auth')

const app = express()

/**
 * Handlebars setup
 */
app.set('views', __dirname + "/templates")
app.set('view engine', 'hbs')
app.engine('hbs', handlebars.engine())

/**
 * Middleware for parsing URL-encoded bodies and serving static files
 */
app.use(express.urlencoded({ extended: true }))
app.use('/static', express.static(__dirname + "/static"))
app.use('/photos', express.static(__dirname + "/photos"))

/**
 * In-memory login store
 */
const loggedInUsers = {}

/**
 * Parse cookies from the request
 * @param {Object} req - Express request object
 * @returns {Object} Parsed cookies as key-value pairs
 */
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

/**
 * Middleware to ensure user is logged in
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware
 */
function ensureLogin(req, res, next) {
    const cookies = parseCookies(req)
    const sessionID = cookies.sessionID
    if (!sessionID || !loggedInUsers[sessionID]) {
        return res.redirect('/login')
    }
    req.user = loggedInUsers[sessionID]
    next()
}

/**
 * Homepage route
 */
app.get('/', ensureLogin, async (req, res) => {
    let albumList = await business.getAlbums()
    res.render('index', { albums: albumList, user: req.user, layout: undefined })
})

/**
 * Login page route
 */
app.get('/login', (req, res) => {
    res.render('login', { layout: undefined })
})

/**
 * Login POST handler
 */
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

/**
 * Logout route
 */
app.get('/logout', (req, res) => {
    const cookies = parseCookies(req)
    const sessionID = cookies.sessionID
    if (sessionID) delete loggedInUsers[sessionID]
    res.setHeader('Set-Cookie', 'sessionID=; Max-Age=0')
    res.redirect('/login')
})

/**
 * Register page route
 */
app.get('/register', (req, res) => {
    res.render('register', { layout: undefined })
})

/**
 * Register POST handler
 */
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

/**
 * Album page route
 */
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

/**
 * Photo details page route
 */
app.get('/photo-details/:pid', ensureLogin, async (req, res) => {
    let photoId = Number(req.params.pid)
    let photoDetails = await business.getPhotoDetails(photoId)

    if (!photoDetails) return res.send("Photo not found.")
    if (photoDetails.visibility === "private" && photoDetails.ownerID !== req.user.ownerID) {
        return res.send("This photo is private.")
    }

    /**
     * Get comments for the photo
     */
    const comments = await business.getComments(photoId)

    res.render('view_photo', { photo: photoDetails, user: req.user, comments, layout: undefined })
})

/**
 * Add comment to a photo
 */
app.post('/photo-details/:pid/comment', ensureLogin, async (req, res) => {
    let photoId = Number(req.params.pid)
    const text = req.body.text
    if (!text || text.trim() === '') return res.redirect(`/photo-details/${photoId}`)

    await business.addComment(photoId, req.user.username, text.trim())
    res.redirect(`/photo-details/${photoId}`)
})

/**
 * Edit photo page route
 */
app.get('/edit-photo', ensureLogin, async (req, res) => {
    let photoId = Number(req.query.pid)
    let photoDetails = await business.getPhotoDetails(photoId)

    if (photoDetails.ownerID !== req.user.ownerID) {
        return res.send('You are not allowed to edit this photo')
    }

    let visibility = "private"
    if (photoDetails.visibility === "public") visibility = "public"

    let selectPrivate = ""
    let selectPublic = ""
    if (visibility === "private") selectPrivate = "selected"
    else selectPublic = "selected"

    photoDetails.selectPrivate = selectPrivate
    photoDetails.selectPublic = selectPublic

    res.render('edit_photo', { photo: photoDetails, user: req.user.username, layout: undefined })
})

/**
 * Edit photo POST handler
 */
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

/**
 * Start the Express server
 */
app.listen(8000, () => {
    console.log('Server started on port 8000')
})

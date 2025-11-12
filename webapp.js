const express = require('express')
const handlebars = require('express-handlebars')
const session = require('express-session')
const business = require('./business')
const auth = require('./auth')
const app = express()

app.set('views', __dirname + "/templates")
app.set('view engine', 'hbs')
app.engine('hbs', handlebars.engine())

app.use(express.urlencoded({ extended: true }))
app.use('/static', express.static(__dirname + "/static"))
app.use('/photos', express.static(__dirname + "/photos"))

// --- SESSION ---
app.use(session({
    secret: 'photoSecret',
    resave: false,
    saveUninitialized: false
}))

// --- Middleware to check login ---
function ensureLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login')
    }
    next()
}

// --- Homepage ---
app.get('/', ensureLogin, async (req, res) => {
    let albumList = await business.getAlbums()
    res.render('index', { albums: albumList, user: req.session.user, layout: undefined })
})

// --- Login Routes ---
app.get('/login', (req, res) => {
    res.render('login', { layout: undefined })
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body
    const user = await auth.verifyUser(username, password)
    if (user) {
        req.session.user = user
        res.redirect('/')
    } else {
        res.render('login', { error: 'Invalid username or password', layout: undefined })
    }
})

// --- Logout Route ---
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'))
})

// --- Register Routes ---
app.get('/register', (req, res) => {
    res.render('register', { layout: undefined })
})

app.post('/register', async (req, res) => {
    const { name, email, username, password } = req.body
    const result = await auth.registerUser(name, email, username, password)
    if (result.success) {
        req.session.user = result.user
        res.redirect('/')
    } else {
        res.render('register', { error: result.message, layout: undefined })
    }
})

// --- Album & Photo Routes ---
app.get('/album/:aid', ensureLogin, async (req, res) => {
    let albumId = Number(req.params.aid)
    let albumDetails = await business.getAlbumDetails(albumId)
    let photoList = await business.getPhotosInAlbum(albumId)

    let visiblePhotos = []
    for (let photo of photoList) {
        if (photo.visibility !== "private" || photo.owner === req.session.user.id) {
            visiblePhotos.push(photo)
        }
    }

    res.render('album', { album: albumDetails, photos: visiblePhotos, user: req.session.user, layout: undefined })
})

app.get('/photo-details/:pid', ensureLogin, async (req, res) => {
    let photoId = Number(req.params.pid)
    let photoDetails = await business.getPhotoDetails(photoId)

    if (photoDetails.visibility === "private" && photoDetails.owner !== req.session.user.id) {
        return res.send("This photo is private.")
    }

    res.render('view_photo', { photo: photoDetails, user: req.session.user, layout: undefined })
})

app.get('/edit-photo', ensureLogin, async (req, res) => {
    let photoId = Number(req.query.pid)
    let photoDetails = await business.getPhotoDetails(photoId)

    if (photoDetails.owner !== req.session.user.id) {
        return res.send('You are not allowed to edit this photo')
    }

    // LEVEL 1: Set default visibility
    let visibility = "private"
    if (photoDetails.visibility === "public") {
        visibility = "public"
    } else if (!photoDetails.visibility) {
        visibility = "public"
    }

    // LEVEL 1: Set select options
    let selectPrivate = ""
    let selectPublic = ""
    if (visibility === "private") {
        selectPrivate = "selected"
    } else {
        selectPublic = "selected"
    }

    photoDetails.selectPrivate = selectPrivate
    photoDetails.selectPublic = selectPublic

    res.render('edit_photo', { photo: photoDetails, user: req.session.user, layout: undefined })
})

app.post('/edit-photo', ensureLogin, async (req, res) => {
    let photoId = Number(req.body.id)
    let photoDetails = await business.getPhotoDetails(photoId)

    if (photoDetails.owner !== req.session.user.id) {
        return res.send('You are not allowed to edit this photo')
    }

    let title = req.body.title
    let description = req.body.description
    let visibility = req.body.visibility  // ← comes from <select>

    await business.updatePhoto(photoId, title, description, visibility)
    res.redirect(`/photo-details/${photoId}`)
})

app.listen(8000, () => {
    console.log('Server started on port 8000')
})
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
    let albumId = Number(req.params.aid);
    let albumDetails = await business.getAlbumDetails(albumId);

    let visiblePhotos = await business.getPhotosInAlbum(albumId, req.session.user);

    res.render('album', { 
        album: albumDetails, 
        photos: visiblePhotos, 
        count: visiblePhotos.length,
        user: req.session.user, 
        layout: undefined 
    });
});

app.get('/photo-details/:pid', ensureLogin, async (req, res) => {
    let photoId = Number(req.params.pid)
    let photoDetails = await business.getPhotoDetails(photoId)

    if (photoDetails && photoDetails.visibility === "private" && photoDetails.ownerID !== req.session.user.ownerID) {
        return res.send("This photo is private.")
    }

    if (!photoDetails) {
        return res.send("Photo not found.")
    }

    res.render('view_photo', { photo: photoDetails, user: req.session.user, layout: undefined })
})


app.get('/edit-photo', ensureLogin, async (req, res) => {
    let photoId = Number(req.query.pid)
    let photoDetails = await business.getPhotoDetails(photoId)

    // console.log('photo ownerID:', photoDetails.ownerID)
    // console.log('logged in user ownerID:', req.session.user.ownerID)
    // console.log('logged in username:', req.session.user.username)

    if (photoDetails.ownerID !== req.session.user.ownerID) {
        return res.send('You are not allowed to edit this photo')
    }

    
    // Set default visibility
    let visibility = "private"
    if (photoDetails.visibility === "public") {
        visibility = "public"
    } else if (!photoDetails.visibility) {
        visibility = "public"
    }

    // Set select options
    let selectPrivate = ""
    let selectPublic = ""
    if (visibility === "private") {
        selectPrivate = "selected"
    } else {
        selectPublic = "selected"
    }

    photoDetails.selectPrivate = selectPrivate
    photoDetails.selectPublic = selectPublic

    res.render('edit_photo', { photo: photoDetails, user: req.session.user.username, layout: undefined })
})

app.post('/edit-photo', ensureLogin, async (req, res) => {
    let photoId = Number(req.body.id)
    let photoDetails = await business.getPhotoDetails(photoId)

    
    if (photoDetails.ownerID !== req.session.user.ownerID) {
        return res.send('You are not allowed to edit this photo')
    }

    let title = req.body.title
    let description = req.body.description
    let visibility = req.body.visibility  // ← comes from <select>

    await business.updatePhoto(photoId, title, description, visibility)
    res.redirect(`/photo-details/${photoId}`)
})


app.get('/photo-details/:pid', ensureLogin, async (req, res) => {
    const photoId = Number(req.params.pid);
    const photo = await business.getPhotoDetails(photoId);
    if (!photo) return res.send("Photo not found.");

    // Private photo check
    if (photo.visibility === "private" && photo.ownerID !== req.session.user.ownerID) {
        return res.send("This photo is private.");
    }

    res.render('view_photo', {
        photo,
        comments: photo.comments || [],  // pass comments array to template
        user: req.session.user,
        layout: undefined
    });
});

app.post('/photo-details/:pid/comment', ensureLogin, async (req, res) => {
    const photoId = Number(req.params.pid); // match type in MongoDB
    const text = req.body.text?.trim();
    if (!text) return res.redirect(`/photo-details/${photoId}`);

    const photo = await business.getPhotoDetails(photoId);
    if (!photo) return res.send("Photo not found.");

    if (!photo.comments) photo.comments = [];
    photo.comments.push({
        username: req.session.user.username,
        text,
        date: new Date()
    });

    await business.updatePhotoComments(photoId, photo.comments);
    res.redirect(`/photo-details/${photoId}`);
});


app.listen(8000, () => {
    console.log('Server started on port 8000')
})
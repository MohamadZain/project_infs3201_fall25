//webapp.js
const express = require('express');
const handlebars = require('express-handlebars');
const crypto = require('crypto');
const fileUpload = require('express-fileupload');
const path = require('path');

const business = require('./business');
const auth = require('./auth');

const app = express();

/**
 * Handlebars setup
 */
app.set('views', __dirname + "/templates");
app.set('view engine', 'hbs');
app.engine('hbs', handlebars.engine());

/**
 * Middleware for parsing URL-encoded bodies and serving static files
 */
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(__dirname + "/static"));
app.use('/photos', express.static(__dirname + "/photos"));

/**
 * Middleware for file uploads
 */
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
}));

/**
 * In-memory login store
 */
const loggedInUsers = {};

/**
 * Parse cookies from the request
 */
function parseCookies(req) {
    const list = {};
    const rc = req.headers.cookie;
    if (!rc) return list;

    rc.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
    });
    return list;
}

/**
 * Middleware to ensure user is logged in
 */
function ensureLogin(req, res, next) {
    const cookies = parseCookies(req);
    const sessionID = cookies.sessionID;
    if (!sessionID || !loggedInUsers[sessionID]) {
        return res.redirect('/login');
    }
    req.user = loggedInUsers[sessionID];
    next();
}

/**
 * Homepage route
 */
app.get('/', ensureLogin, async (req, res) => {
    let albumList = await business.getAlbums();
    const comments = await business.getCommentsForUserPhotos(req.user.ownerID);
    const commentCount = comments.length; // for optional display
    res.render('index', { albums: albumList, user: req.user, commentCount, layout: undefined });
});

/**
 * Login page
 */
app.get('/login', (req, res) => {
    res.render('login', { layout: undefined });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await auth.verifyUser(username, password);
    if (user) {
        const sessionID = crypto.randomUUID();
        loggedInUsers[sessionID] = user;
        res.setHeader('Set-Cookie', `sessionID=${sessionID}; HttpOnly`);
        res.redirect('/');
    } else {
        res.render('login', { error: 'Invalid username or password', layout: undefined });
    }
});

/**
 * Logout
 */
app.get('/logout', (req, res) => {
    const cookies = parseCookies(req);
    const sessionID = cookies.sessionID;
    if (sessionID) delete loggedInUsers[sessionID];
    res.setHeader('Set-Cookie', 'sessionID=; Max-Age=0');
    res.redirect('/login');
});

/**
 * Register
 */
app.get('/register', (req, res) => {
    res.render('register', { layout: undefined });
});

app.post('/register', async (req, res) => {
    const { name, email, username, password } = req.body;
    const result = await auth.registerUser(name, email, username, password);
    if (result.success) {
        const sessionID = crypto.randomUUID();
        loggedInUsers[sessionID] = result.user;
        res.setHeader('Set-Cookie', `sessionID=${sessionID}; HttpOnly`);
        res.redirect('/');
    } else {
        res.render('register', { error: result.message, layout: undefined });
    }
});
// GET change password page
app.get('/change-password', ensureLogin, (req, res) => {
    res.render('change_password', { user: req.user, layout: undefined });
});

// POST change password
app.post('/change-password', ensureLogin, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.render('change_password', { 
            user: req.user, 
            error: 'All fields are required', 
            layout: undefined 
        });
    }

    if (newPassword !== confirmPassword) {
        return res.render('change_password', { 
            user: req.user, 
            error: 'New passwords do not match', 
            layout: undefined 
        });
    }

    const success = await auth.changePassword(req.user.username, currentPassword, newPassword);

    if (success) {
        res.render('change_password', { 
            user: req.user, 
            message: 'Password successfully changed!', 
            layout: undefined 
        });
    } else {
        res.render('change_password', { 
            user: req.user, 
            error: 'Current password is incorrect', 
            layout: undefined 
        });
    }
});


/**
 * Album page
 */
app.get('/album/:aid', ensureLogin, async (req, res) => {
    let albumId = Number(req.params.aid);
    let albumDetails = await business.getAlbumDetails(albumId);
    let visiblePhotos = await business.getPhotosInAlbum(albumId, req.user);

    res.render('album', { 
        album: albumDetails, 
        photos: visiblePhotos, 
        count: visiblePhotos.length,
        user: req.user, 
        layout: undefined 
    });
});

/**
 * Photo details page
 */
app.get('/photo-details/:pid', ensureLogin, async (req, res) => {
    let photoId = Number(req.params.pid);
    let photoDetails = await business.getPhotoDetails(photoId);

    if (!photoDetails) return res.send("Photo not found.");
    if (photoDetails.visibility === "private" && photoDetails.ownerID !== req.user.ownerID) {
        return res.send("This photo is private.");
    }

    const comments = await business.getComments(photoId);

    res.render('view_photo', { photo: photoDetails, user: req.user, comments, layout: undefined });
});

app.post('/photo-details/:pid/comment', ensureLogin, async (req, res) => {
    let photoId = Number(req.params.pid);
    const text = req.body.text;
    if (!text || text.trim() === '') return res.redirect(`/photo-details/${photoId}`);

    await business.addComment(photoId, req.user.username, text.trim());
    res.redirect(`/photo-details/${photoId}`);
});

/**
 * Edit photo
 */
app.get('/edit-photo', ensureLogin, async (req, res) => {
    let photoId = Number(req.query.pid);
    let photoDetails = await business.getPhotoDetails(photoId);

    if (photoDetails.ownerID !== req.user.ownerID) {
        return res.send('You are not allowed to edit this photo');
    }

    let visibility = "private";
    if (photoDetails.visibility === "public") visibility = "public";

    let selectPrivate = "";
    let selectPublic = "";
    if (visibility === "private") selectPrivate = "selected";
    else selectPublic = "selected";

    photoDetails.selectPrivate = selectPrivate;
    photoDetails.selectPublic = selectPublic;

    res.render('edit_photo', { photo: photoDetails, user: req.user.username, layout: undefined });
});

app.post('/edit-photo', ensureLogin, async (req, res) => {
    let photoId = Number(req.body.id);
    let photoDetails = await business.getPhotoDetails(photoId);

    if (photoDetails.ownerID !== req.user.ownerID) {
        return res.send('You are not allowed to edit this photo');
    }

    let title = req.body.title;
    let description = req.body.description;
    let visibility = req.body.visibility;

    await business.updatePhoto(photoId, title, description, visibility);
    res.redirect(`/photo-details/${photoId}`);
});

/**
 * Create album
 */
app.get('/albums/create', ensureLogin, (req, res) => {
    res.render('create_album', { user: req.user, layout: undefined });
});

app.post('/albums/create', ensureLogin, async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
        return res.render('create_album', { user: req.user, error: 'Album name required', layout: undefined });
    }
    await business.createAlbum(name.trim(), req.user);
    res.redirect('/');
});

/**
 * Comment notifications route
 */
app.get('/notifications', ensureLogin, async (req, res) => {
    const ownerID = req.user.ownerID;
    const comments = await business.getCommentsForUserPhotos(ownerID);

    res.render('notifications', { user: req.user, comments, layout: undefined });
});

/**
 * Search photos by title, description, or tags (public only)
 */
/**
 * Upload photo - GET route (show upload form)
 */
app.get('/album/:aid/upload', ensureLogin, async (req, res) => {
    let albumId = Number(req.params.aid);
    let albumDetails = await business.getAlbumDetails(albumId);
    
    if (!albumDetails) {
        return res.send('Album not found');
    }

    res.render('upload_photo', { album: albumDetails, user: req.user, layout: undefined });
});


/**
 * Upload photo - POST route (handle file upload)
 */
app.post('/album/:aid/upload', ensureLogin, async (req, res) => {
    let albumId = Number(req.params.aid);
    let albumDetails = await business.getAlbumDetails(albumId);
    
    if (!albumDetails) {
        return res.send('Album not found');
    }

    // Check if file was uploaded
    if (!req.files || !req.files.photo) {
        return res.render('upload_photo', { 
            album: albumDetails, 
            user: req.user, 
            error: 'Please select a photo to upload',
            layout: undefined 
        });
    }

    let uploadedFile = req.files.photo;
    
    // Check if it's an image file
    let allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    let isValidType = false;
    for (let i = 0; i < allowedTypes.length; i++) {
        if (uploadedFile.mimetype === allowedTypes[i]) {
            isValidType = true;
            break;
        }
    }
    
    if (!isValidType) {
        return res.render('upload_photo', { 
            album: albumDetails, 
            user: req.user, 
            error: 'Only image files (JPEG, PNG, GIF) are allowed',
            layout: undefined 
        });
    }

    // Get title, description, visibility, and tags from form
    let title = req.body.title || '';
    let description = req.body.description || '';
    let visibility = req.body.visibility || 'private';
    
    // Process tags - split by comma and clean up
    let tagsArray = [];
    if (req.body.tags && req.body.tags.trim() !== '') {
        let tagsList = req.body.tags.split(',');
        for (let i = 0; i < tagsList.length; i++) {
            let tag = tagsList[i].trim().toLowerCase();
            if (tag !== '') {
                tagsArray.push(tag);
            }
        }
    }

    // Generate unique filename using timestamp and random string
    let fileExtension = path.extname(uploadedFile.name);
    let timestamp = Date.now();
    let randomString = crypto.randomBytes(8).toString('hex');
    let newFilename = 'photo_' + timestamp + '_' + randomString + fileExtension;

    // Save file to photos folder
    let uploadPath = path.join(__dirname, 'photos', newFilename);
    
    uploadedFile.mv(uploadPath, async function(err) {
        if (err) {
            return res.render('upload_photo', { 
                album: albumDetails, 
                user: req.user, 
                error: 'Error uploading file',
                layout: undefined 
            });
        }

        // Create photo record in database with user-provided data
        let photoData = {
            filename: newFilename,
            title: title,
            description: description,
            tags: tagsArray,  // Tags from form input
            visibility: visibility,
            ownerID: req.user.ownerID,
            albumId: albumId,
            date: new Date().toISOString(),
            resolution: uploadedFile.size
        };

        await business.uploadPhoto(photoData);
        
        // Redirect back to the album page
        res.redirect('/album/' + albumId);
    });
});
/**
 * Search photos by title, description, or tags (public only)
 */
app.get('/search', ensureLogin, async (req, res) => {
    const query = req.query.q;
    if (!query || query.trim() === '') {
        return res.render('search_results', { photos: [], user: req.user, layout: undefined });
    }

    const allAlbums = await business.getAlbums();
    const matchingPhotos = [];

    // Loop through all albums and photos
    for (let i = 0; i < allAlbums.length; i++) {
        const photos = await business.getPhotosInAlbum(allAlbums[i].id, req.user);
        for (let j = 0; j < photos.length; j++) {
            const p = photos[j];
            if (p.visibility !== 'public') continue; // only public photos

            const titleMatch = p.title && p.title.toLowerCase().includes(query.toLowerCase());
            const descMatch = p.description && p.description.toLowerCase().includes(query.toLowerCase());
            let tagMatch = false;
            if (p.tags) {
                for (let t = 0; t < p.tags.length; t++) {
                    if (p.tags[t].toLowerCase().includes(query.toLowerCase())) {
                        tagMatch = true;
                        break;
                    }
                }
            }

            if (titleMatch || descMatch || tagMatch) {
                matchingPhotos.push(p);
            }
        }
    }

    res.render('search_results', { photos: matchingPhotos, user: req.user, layout: undefined });
});
/**
 * Start server
 */
app.listen(8000, () => {
    console.log('Server started on port 8000');
});
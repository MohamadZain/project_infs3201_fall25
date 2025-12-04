// webapp.js 
const express = require('express');
const handlebars = require('express-handlebars');
const crypto = require('crypto');
const fileUpload = require('express-fileupload');
const path = require('path');

const business = require('./business');  // Handles database/photo operations
const auth = require('./auth');          // Handles user authentication
const email = require('./email');        // Handles email notifications

const app = express();

/**
 * Set up Handlebars as the view engine
 */
app.set('views', __dirname + "/templates");
app.set('view engine', 'hbs');
app.engine('hbs', handlebars.engine({
    helpers: {
        /**
         * Handlebars helper to check equality
         * @param {*} a 
         * @param {*} b 
         * @returns {boolean}
         */
        eq: function(a, b) { return a === b; }
    }
}));

/**
 * Middleware
 */
app.use(express.urlencoded({ extended: true })); 
app.use('/static', express.static(__dirname + "/static")); 
app.use('/photos', express.static(__dirname + "/photos")); 
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } })); // Max 50MB file upload

/**
 * In-memory store for logged-in users (sessionID -> user object)
 * @type {Object.<string, Object>}
 */
const loggedInUsers = {};

/**
 * Parse cookies from request headers
 * @param {express.Request} req 
 * @returns {Object.<string,string>} Parsed cookies
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
 * Middleware to ensure the user is logged in
 * @param {express.Request} req 
 * @param {express.Response} res 
 * @param {function} next 
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

// ==================== ROUTES ====================

/**
 * Homepage - display albums and user's comment count
 */
app.get('/', ensureLogin, async (req, res) => {
    let albumList = await business.getAlbums();
    const comments = await business.getCommentsForUserPhotos(req.user.ownerID);
    const commentCount = comments.length || 0;
    res.render('index', { albums: albumList, user: req.user, commentCount, layout: undefined });
});

/**
 * Login page
 */
app.get('/login', (req, res) => res.render('login', { layout: undefined }));

/**
 * Process login form
 */
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
 * Logout the user and clear session
 */
app.get('/logout', (req, res) => {
    const cookies = parseCookies(req);
    const sessionID = cookies.sessionID;
    if (sessionID) delete loggedInUsers[sessionID];
    res.setHeader('Set-Cookie', 'sessionID=; Max-Age=0');
    res.redirect('/login');
});

/**
 * Registration page
 */
app.get('/register', (req, res) => res.render('register', { layout: undefined }));

/**
 * Process registration form
 */
app.post('/register', async (req, res) => {
    const { name, email: userEmail, username, password } = req.body;
    const result = await auth.registerUser(name, userEmail, username, password);
    if (result.success) {
        const sessionID = crypto.randomUUID();
        loggedInUsers[sessionID] = result.user;
        res.setHeader('Set-Cookie', `sessionID=${sessionID}; HttpOnly`);
        res.redirect('/');
    } else {
        res.render('register', { error: result.message, layout: undefined });
    }
});

/**
 * Change password page
 */
app.get('/change-password', ensureLogin, (req, res) => {
    res.render('change_password', { user: req.user, layout: undefined });
});

/**
 * Process change password form
 */
app.post('/change-password', ensureLogin, async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.render('change_password', { user: req.user, error: 'All fields required', layout: undefined });
    }
    if (newPassword !== confirmPassword) {
        return res.render('change_password', { user: req.user, error: 'New passwords do not match', layout: undefined });
    }
    const success = await auth.changePassword(req.user.username, currentPassword, newPassword);
    if (success) {
        res.render('change_password', { user: req.user, message: 'Password changed!', layout: undefined });
    } else {
        res.render('change_password', { user: req.user, error: 'Current password incorrect', layout: undefined });
    }
});

/**
 * Album page – FIXED: now handles deleted/missing albums gracefully
 */
app.get('/album/:aid', ensureLogin, async (req, res) => {
    let albumId = Number(req.params.aid);
    let albumDetails = await business.getAlbumDetails(albumId);
    
    if (!albumDetails) {
        return res.status(404).send("<h2>Album not found or has been deleted.</h2><a href='/'>Back to Home</a>");
    }

    let visiblePhotos = await business.getPhotosInAlbum(albumId, req.user);
    res.render('album', { album: albumDetails, photos: visiblePhotos, count: visiblePhotos.length, user: req.user, layout: undefined });
});

/**
 * Photo details page – FIXED: now handles deleted/missing photos + private access
 */
app.get('/photo-details/:pid', ensureLogin, async (req, res) => {
    let photoId = Number(req.params.pid);
    let photoDetails = await business.getPhotoDetails(photoId);

    // Handle non-existent photo
    if (!photoDetails) {
        return res.status(404).send("<h2>Photo not found or has been deleted.</h2><a href='/'>Back to Home</a>");
    }

    // Handle private photo access
    if (photoDetails.visibility === "private" && photoDetails.ownerID !== req.user.ownerID) {
        return res.status(403).send("<h2>This photo is private.</h2><a href='/'>Back to Home</a>");
    }

    const owner = await auth.getUserByID(photoDetails.ownerID);
    photoDetails.ownerUsername = owner ? owner.username : "Unknown";

    const comments = await business.getComments(photoId);
    res.render('view_photo', { photo: photoDetails, user: req.user, comments, layout: undefined });
});

/**
 * Add a comment to a photo
 */
app.post('/photo-details/:pid/comment', ensureLogin, async (req, res) => {
    let photoId = Number(req.params.pid);
    const text = req.body.text?.trim();
    if (!text) return res.redirect(`/photo-details/${photoId}`);
    await business.addComment(photoId, req.user.username, text);

    const photoDetails = await business.getPhotoDetails(photoId);
    if (photoDetails && photoDetails.ownerID !== req.user.ownerID) {
        const ownerUser = await auth.getUserByID(photoDetails.ownerID);
        const ownerEmail = ownerUser ? ownerUser.email : "unknown@example.com";
        await email.sendMail(ownerEmail, `New comment on "${photoDetails.title}"`, `${req.user.username} commented: "${text}"`);
    }
    res.redirect(`/photo-details/${photoId}`);
});

/**
 * Edit photo page (owner only)
 */
app.get('/edit-photo', ensureLogin, async (req, res) => {
    let photoId = Number(req.query.pid);
    let photoDetails = await business.getPhotoDetails(photoId);
    if (!photoDetails || photoDetails.ownerID !== req.user.ownerID) {
        return res.status(403).send('Access denied or photo not found');
    }

    let tagsString = photoDetails.tags ? photoDetails.tags.join(', ') : '';
    photoDetails.tagsString = tagsString;
    photoDetails.selectPrivate = (photoDetails.visibility === "private") ? "selected" : "";
    photoDetails.selectPublic  = (photoDetails.visibility === "public")  ? "selected" : "";

    res.render('edit_photo', { photo: photoDetails, user: req.user, layout: undefined });
});

/**
 * Process photo edit (owner only)
 */
app.post('/edit-photo', ensureLogin, async (req, res) => {
    let photoId = Number(req.body.id);
    let photoDetails = await business.getPhotoDetails(photoId);
    if (!photoDetails || photoDetails.ownerID !== req.user.ownerID) {
        return res.send('Access denied');
    }

    let title = req.body.title || '';
    let description = req.body.description || '';
    let visibility = req.body.visibility || 'private';
    let tagsArray = req.body.tags ? req.body.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [];

    await business.updatePhoto(photoId, title, description, visibility, tagsArray);
    res.redirect(`/photo-details/${photoId}`);
});

/**
 * Notifications page
 */
app.get('/notifications', ensureLogin, async (req, res) => {
    const notifications = email.getNotifications(req.user.email);
    notifications.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.render('notifications', { user: req.user, notifications, layout: undefined });
});

/**
 * Upload photo page
 */
app.get('/album/:aid/upload', ensureLogin, async (req, res) => {
    let albumId = Number(req.params.aid);
    let albumDetails = await business.getAlbumDetails(albumId);
    if (!albumDetails) return res.status(404).send("Album not found");
    res.render('upload_photo', { album: albumDetails, user: req.user, layout: undefined });
});

/**
 * Process photo upload
 */
app.post('/album/:aid/upload', ensureLogin, async (req, res) => {
    let albumId = Number(req.params.aid);
    let albumDetails = await business.getAlbumDetails(albumId);
    if (!albumDetails) return res.send('Album not found');

    if (!req.files || !req.files.photo) return res.render('upload_photo', { album: albumDetails, user: req.user, error: 'Select a photo', layout: undefined });

    let file = req.files.photo;
    let allowed = ['image/jpeg','image/jpg','image/png','image/gif'];
    if (!allowed.includes(file.mimetype)) return res.render('upload_photo', { album: albumDetails, user: req.user, error: 'Only images', layout: undefined });

    let title = req.body.title || '';
    let desc = req.body.description || '';
    let vis = req.body.visibility || 'private';
    let tags = req.body.tags ? req.body.tags.split(',').map(t=>t.trim().toLowerCase()).filter(t=>t) : [];

    let ext = path.extname(file.name);
    let filename = 'photo_' + Date.now() + '_' + crypto.randomBytes(8).toString('hex') + ext;
    let savePath = path.join(__dirname, 'photos', filename);

    file.mv(savePath, async () => {
        await business.uploadPhoto({
            filename, title, description: desc, tags, visibility: vis,
            ownerID: req.user.ownerID, albumId, date: new Date().toISOString(), resolution: file.size
        });
        res.redirect('/album/' + albumId);
    });
});

/**
 * Search photos (public only)
 */
app.get('/search', ensureLogin, async (req, res) => {
    const q = (req.query.q || '').trim().toLowerCase();
    if (!q) return res.render('search_results', { photos: [], user: req.user, layout: undefined });

    const albums = await business.getAlbums();
    const results = [];

    for (let a of albums) {
        const photos = await business.getPhotosInAlbum(a.id, req.user);
        for (let p of photos) {
            if (p.visibility !== 'public') continue;
            if (
                (p.title && p.title.toLowerCase().includes(q)) ||
                (p.description && p.description.toLowerCase().includes(q)) ||
                (p.tags && p.tags.some(t => t.includes(q)))
            ) results.push(p);
        }
    }
    res.render('search_results', { photos: results, user: req.user, layout: undefined });
});

app.listen(8000, () => console.log('Running on http://localhost:8000'));
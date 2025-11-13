// persistence.js
// -----------------------------------------------------------
// Persistence Layer
// Direct MongoDB access only — no business logic
// -----------------------------------------------------------

const mongodb = require('mongodb')

let client = undefined;
let db = undefined;
let photoCollection = undefined;
let albumCollection = undefined;
let commentCollection = undefined; // NEW

/**
 * Connect to MongoDB if not already connected
 */
async function connectDatabase() {
    if (client) return
    client = new mongodb.MongoClient('mongodb+srv://student:12class34@cluster1.sjh42tn.mongodb.net/')
    await client.connect()
    db = client.db('infs3201_fall2025')
    photoCollection = db.collection('photos');
    albumCollection = db.collection('albums');
    commentCollection = db.collection('comments'); // NEW
}

/**
 * Close MongoDB connection
 */
async function close() {
    if (client) {
        await client.close()
        client = undefined
    }
}

/**
 * Get album by ID
 */
async function getAlbumDetails(albumId) {
    await connectDatabase();
    return await albumCollection.findOne({ id: albumId });
}

/**
 * Get album by name
 */
async function getAlbumDetailsByName(name) {
    await connectDatabase();
    return await albumCollection.findOne({ name });
}

/**
 * Get photo by ID
 */
async function getPhotoDetails(photoId) {
    await connectDatabase();
    return await photoCollection.findOne({ id: photoId });
}

/**
 * Get all photos in an album
 */
async function getPhotosInAlbum(albumId) {
    await connectDatabase();
    const cursor = photoCollection.find({ albums: albumId });
    return await cursor.toArray();
}

/**
 * Update photo fields
 */
async function updatePhoto(pid, title, description, visibility) {
    await connectDatabase();
    const updateObj = { title, description };
    if (visibility) updateObj.visibility = visibility;
    const res = await photoCollection.updateOne(
        { id: pid },
        { $set: updateObj }
    );
    return res.modifiedCount === 1;
}

/**
 * Add tag to photo
 */
async function addTag(pid, tag) {
    await connectDatabase();
    const photo = await getPhotoDetails(pid);
    if (!photo) return false;
    if (!photo.tags) photo.tags = []

    let exists = false;
    for (let i = 0; i < photo.tags.length; i++) {
        if (photo.tags[i] === tag) {
            exists = true;
            break;
        }
    }
    if (exists) return false

    photo.tags.push(tag)

    const res = await photoCollection.updateOne(
        { id: pid },
        { $set: { tags: photo.tags } }
    );
    return res.modifiedCount === 1;
}

/**
 * Get all albums
 */
async function getAlbums() {
    await connectDatabase();
    return await albumCollection.find().toArray();
}

/**
 * COMMENTS FUNCTIONS
 */

// Get all comments for a photo
async function getComments(photoId) {
    await connectDatabase();
    return await commentCollection.find({ photoId }).toArray();
}

// Add a comment to a photo
async function addComment(photoId, username, text) {
    await connectDatabase();
    const newComment = {
        photoId,
        username,
        text,
        date: new Date()
    }
    await commentCollection.insertOne(newComment)
    return true
}

module.exports = {
    getPhotoDetails,
    getPhotosInAlbum,
    getAlbumDetails,
    getAlbums,
    getAlbumDetailsByName,
    updatePhoto,
    addTag,
    close,
    getComments,      // NEW
    addComment        // NEW
}

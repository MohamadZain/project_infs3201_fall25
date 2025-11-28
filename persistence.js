//persistence.js

const mongodb = require('mongodb')

let client = undefined;
let db = undefined;
let photoCollection = undefined;
let albumCollection = undefined;
let commentCollection = undefined;

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
    commentCollection = db.collection('comments');
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
 * @param {number} albumId 
 * @returns {Promise<Object|null>}
 */
async function getAlbumDetails(albumId) {
    await connectDatabase();
    return await albumCollection.findOne({ id: albumId });
}

/**
 * Get album by name
 * @param {string} name 
 * @returns {Promise<Object|null>}
 */
async function getAlbumDetailsByName(name) {
    await connectDatabase();
    return await albumCollection.findOne({ name });
}

/**
 * Get photo by ID
 * @param {number} photoId 
 * @returns {Promise<Object|null>}
 */
async function getPhotoDetails(photoId) {
    await connectDatabase();
    return await photoCollection.findOne({ id: photoId });
}

/**
 * Get all photos in an album
 * @param {number} albumId 
 * @returns {Promise<Array>}
 */
async function getPhotosInAlbum(albumId) {
    await connectDatabase();
    const cursor = photoCollection.find({ albums: albumId });
    return await cursor.toArray();
}

/**
 * Update photo fields
 * @param {number} pid 
 * @param {string} title 
 * @param {string} description 
 * @param {string} [visibility] 
 * @returns {Promise<boolean>}
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
 * @param {number} pid 
 * @param {string} tag 
 * @returns {Promise<boolean>}
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
 * @returns {Promise<Array>}
 */
async function getAlbums() {
    await connectDatabase();
    return await albumCollection.find().toArray();
}

/**
 * COMMENTS FUNCTIONS
 */

/**
 * Get all comments for a photo
 * @param {number} photoId 
 * @returns {Promise<Array>}
 */
async function getComments(photoId) {
    await connectDatabase();
    return await commentCollection.find({ photoId }).toArray();
}

/**
 * Add a comment to a photo
 * @param {number} photoId 
 * @param {string} username 
 * @param {string} text 
 * @returns {Promise<boolean>}
 */
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

/**
 * Get all photos in the database
 * @returns {Promise<Array>}
 */
async function getAllPhotos() {
    await connectDatabase();
    return await photoCollection.find().toArray();
}

module.exports.getAllPhotos = getAllPhotos;


module.exports = {
    getPhotoDetails,
    getPhotosInAlbum,
    getAlbumDetails,
    getAlbums,
    getAlbumDetailsByName,
    updatePhoto,
    addTag,
    close,
    getComments,
    addComment
}

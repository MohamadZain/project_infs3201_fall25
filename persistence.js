// persistence.js - FINAL BULLETPROOF VERSION
const mongodb = require('mongodb');

let client = undefined;
let db = undefined;
let photoCollection = undefined;
let albumCollection = undefined;
let commentCollection = undefined;

/**
 * Connect to MongoDB if not already connected.
 * @returns {Promise<void>}
 */
async function connectDatabase() {
    if (client && client.topology && client.topology.isConnected()) {
        return; // Already connected
    }

    try {
        client = new mongodb.MongoClient('mongodb+srv://student:12class34@cluster1.sjh42tn.mongodb.net/');
        await client.connect();
        db = client.db('infs3201_fall2025');

        photoCollection = db.collection('photos');
        albumCollection = db.collection('albums');
        commentCollection = db.collection('comments');

        console.log("Connected to MongoDB successfully");
    } catch (err) {
        console.error("Failed to connect to MongoDB:", err);
        throw err;
    }
}

/**
 * Close MongoDB connection.
 * @returns {Promise<void>}
 */
async function close() {
    if (client) {
        await client.close();
        client = undefined;
        db = undefined;
        photoCollection = undefined;
        albumCollection = undefined;
        commentCollection = undefined;
    }
}

/**
 * Get album details by ID.
 * @param {number|string} albumId
 * @returns {Promise<Object|null>}
 */
async function getAlbumDetails(albumId) {
    await connectDatabase();
    return await albumCollection.findOne({ id: albumId });
}

/**
 * Get album details by name.
 * @param {string} name
 * @returns {Promise<Object|null>}
 */
async function getAlbumDetailsByName(name) {
    await connectDatabase();
    return await albumCollection.findOne({ name });
}

/**
 * Get photo details by ID.
 * @param {number|string} photoId
 * @returns {Promise<Object|null>}
 */
async function getPhotoDetails(photoId) {
    await connectDatabase();
    return await photoCollection.findOne({ id: photoId });
}

/**
 * Get all photos in an album.
 * @param {number|string} albumId
 * @returns {Promise<Array>}
 */
async function getPhotosInAlbum(albumId) {
    await connectDatabase();
    const cursor = photoCollection.find({ albums: albumId });
    return await cursor.toArray();
}

/**
 * Get all albums.
 * @returns {Promise<Array>} List of all albums or empty array.
 */
async function getAlbums() {
    await connectDatabase();
    try {
        const result = await albumCollection.find({}).toArray();
        return result || [];
    } catch (err) {
        console.log("Albums collection not ready or empty → returning []");
        return [];
    }
}

/**
 * Update photo details including tags.
 * @param {number|string} pid - Photo ID
 * @param {string} title
 * @param {string} description
 * @param {string} visibility
 * @param {Array} tags
 * @returns {Promise<boolean>} True if modified successfully
 */
async function updatePhoto(pid, title, description, visibility, tags) {
    await connectDatabase();
    const updateObj = { title, description, visibility };
    if (tags !== undefined) {
        updateObj.tags = tags;
    }
    const res = await photoCollection.updateOne({ id: pid }, { $set: updateObj });
    return res.modifiedCount === 1;
}

/**
 * Add a tag to a photo if it doesn't exist.
 * @param {number|string} pid - Photo ID
 * @param {string} tag
 * @returns {Promise<boolean>} True if tag added successfully
 */
async function addTag(pid, tag) {
    await connectDatabase();
    const photo = await getPhotoDetails(pid);
    if (!photo) return false;
    if (!photo.tags) photo.tags = [];

    let exists = false;
    for (let i = 0; i < photo.tags.length; i++) {
        if (photo.tags[i] === tag) {
            exists = true;
            break;
        }
    }
    if (exists) return false;

    photo.tags.push(tag);
    const res = await photoCollection.updateOne({ id: pid }, { $set: { tags: photo.tags } });
    return res.modifiedCount === 1;
}

/**
 * Get all comments for a photo.
 * @param {number|string} photoId
 * @returns {Promise<Array>}
 */
async function getComments(photoId) {
    await connectDatabase();
    return await commentCollection.find({ photoId }).toArray();
}

/**
 * Add a comment to a photo.
 * @param {number|string} photoId
 * @param {string} username
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function addComment(photoId, username, text) {
    await connectDatabase();
    const newComment = { photoId, username, text, date: new Date() };
    await commentCollection.insertOne(newComment);
    return true;
}

/**
 * Create a new album with auto-incremented ID.
 * @param {string} name
 * @param {number|string} ownerID
 * @returns {Promise<Object>} Newly created album
 */
async function createAlbum(name, ownerID) {
    await connectDatabase();
    const counterColl = db.collection('counters');
    let counterDoc = await counterColl.findOne({ _id: 'albumID' });
    let albumID = counterDoc ? counterDoc.seq + 1 : 1;
    if (counterDoc) {
        await counterColl.updateOne({ _id: 'albumID' }, { $set: { seq: albumID } });
    } else {
        await counterColl.insertOne({ _id: 'albumID', seq: albumID });
    }
    const newAlbum = { id: albumID, name, ownerID };
    await albumCollection.insertOne(newAlbum);
    return newAlbum;
}

/**
 * Create a new photo with auto-incremented ID.
 * @param {Object} photoData
 * @returns {Promise<Object>} Newly created photo
 */
async function createPhoto(photoData) {
    await connectDatabase();
    const counterColl = db.collection('counters');
    let counterDoc = await counterColl.findOne({ _id: 'photoID' });
    let photoID = counterDoc ? counterDoc.seq + 1 : 1;
    if (counterDoc) {
        await counterColl.updateOne({ _id: 'photoID' }, { $set: { seq: photoID } });
    } else {
        await counterColl.insertOne({ _id: 'photoID', seq: photoID });
    }
    const newPhoto = {
        id: photoID,
        filename: photoData.filename,
        title: photoData.title,
        description: photoData.description,
        tags: photoData.tags || [],
        visibility: photoData.visibility,
        ownerID: photoData.ownerID,
        albums: [photoData.albumId],
        date: photoData.date,
        resolution: photoData.resolution
    };
    await photoCollection.insertOne(newPhoto);
    return newPhoto;
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
    getComments,
    addComment,
    createAlbum,
    createPhoto
};

// business.js
const persistence = require('./persistence');

/**
 * Get all albums.
 * @returns {Promise<Array>} List of all albums.
 */
async function getAlbums() {
    return await persistence.getAlbums();
}

/**
 * Get details of a specific album by its ID.
 * @param {string} albumId - ID of the album.
 * @returns {Promise<Object>} Album details.
 */
async function getAlbumDetails(albumId) {
    return await persistence.getAlbumDetails(albumId);
}

/**
 * Get album details by name.
 * @param {string} name - Name of the album.
 * @returns {Promise<Object>} Album details.
 */
async function getAlbumDetailsByName(name) {
    return await persistence.getAlbumDetailsByName(name);
}

/**
 * Get photos in an album visible to a user.
 * @param {string} albumId - Album ID.
 * @param {Object} user - User object with ownerID.
 * @returns {Promise<Array>} List of visible photos.
 */
async function getPhotosInAlbum(albumId, user) {
    const photos = await persistence.getPhotosInAlbum(albumId);
    const visiblePhotos = [];
    for (let i = 0; i < photos.length; i++) {
        if (photos[i].visibility !== 'private' || photos[i].ownerID === user.ownerID) {
            visiblePhotos.push(photos[i]);
        }
    }
    return visiblePhotos;
}

/**
 * Get details of a specific photo by its ID.
 * @param {string} photoId - Photo ID.
 * @returns {Promise<Object>} Photo details.
 */
async function getPhotoDetails(photoId) {
    return await persistence.getPhotoDetails(photoId);
}

/**
 * Update a photo including tags.
 * @param {string} pid - Photo ID.
 * @param {string} title - Photo title.
 * @param {string} description - Photo description.
 * @param {string} visibility - Photo visibility ('public' or 'private').
 * @param {Array} tags - Array of tags for the photo.
 * @returns {Promise<Object>} Updated photo.
 */
async function updatePhoto(pid, title, description, visibility, tags) {
    return await persistence.updatePhoto(pid, title, description, visibility, tags);
}

/**
 * Add a tag to a photo.
 * @param {string} pid - Photo ID.
 * @param {string} tag - Tag to add.
 * @returns {Promise<Object>} Updated photo.
 */
async function addTag(pid, tag) {
    return await persistence.addTag(pid, tag);
}

/**
 * Get comments for a photo.
 * @param {string} photoId - Photo ID.
 * @returns {Promise<Array>} List of comments.
 */
async function getComments(photoId) {
    return await persistence.getComments(photoId);
}

/**
 * Add a comment to a photo.
 * @param {string} photoId - Photo ID.
 * @param {string} username - Commenter's username.
 * @param {string} text - Comment text.
 * @returns {Promise<Object>} Added comment.
 */
async function addComment(photoId, username, text) {
    return await persistence.addComment(photoId, username, text);
}

/**
 * Close the persistence connection.
 * @returns {Promise<void>}
 */
async function close() {
    await persistence.close();
}

/**
 * Create a new album for a user.
 * @param {string} name - Album name.
 * @param {Object} user - User object with ownerID.
 * @returns {Promise<Object>} Created album.
 */
async function createAlbum(name, user) {
    return await persistence.createAlbum(name, user.ownerID);
}

/**
 * Get all comments for all photos of a user.
 * @param {string} ownerID - User ID.
 * @returns {Promise<Array>} List of comments for user's photos.
 */
async function getCommentsForUserPhotos(ownerID) {
    const allAlbums = await persistence.getAlbums();
    const userPhotoIDs = [];

    for (let i = 0; i < allAlbums.length; i++) {
        const photos = await persistence.getPhotosInAlbum(allAlbums[i].id);
        for (let j = 0; j < photos.length; j++) {
            if (photos[j].ownerID === ownerID) userPhotoIDs.push(photos[j].id);
        }
    }

    const commentsForUser = [];
    for (let k = 0; k < userPhotoIDs.length; k++) {
        const comments = await persistence.getComments(userPhotoIDs[k]);
        for (let c = 0; c < comments.length; c++) {
            commentsForUser.push(comments[c]);
        }
    }

    return commentsForUser;
}

/**
 * Upload a new photo.
 * @param {Object} photoData - Photo data including ownerID, title, description, etc.
 * @returns {Promise<Object>} Created photo.
 */
async function uploadPhoto(photoData) {
    return await persistence.createPhoto(photoData);
}

module.exports = {
    getAlbums,
    getAlbumDetails,
    getAlbumDetailsByName,
    getPhotosInAlbum,
    getPhotoDetails,
    updatePhoto,
    addTag,
    close,
    getComments,
    addComment,
    createAlbum,
    getCommentsForUserPhotos,
    uploadPhoto
};

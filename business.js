// business.js
// -----------------------------------------------------------
// Business Logic Layer
// Handles rules: visibility filtering, ownership, etc.
// Does NOT touch MongoDB directly — uses persistence.js
// -----------------------------------------------------------

const persistence = require('./persistence');
const commentsStore = {};

/**
 * Get all albums (no filtering needed)
 * @returns {Promise<Array>} List of album objects
 */
async function getAlbums() {
    return await persistence.getAlbums();
}

/**
 * Get album by ID
 * @param {number} albumId 
 * @returns {Promise<Object|null>}
 */
async function getAlbumDetails(albumId) {
    return await persistence.getAlbumDetails(albumId);
}

/**
 * Get album by name
 * @param {string} name 
 * @returns {Promise<Object|null>}
 */
async function getAlbumDetailsByName(name) {
    return await persistence.getAlbumDetailsByName(name);
}

/**
 * Get all photos in an album, filtered by visibility for current user
 * @param {number} albumId 
 * @param {Object} user - Current logged-in user (from session)
 * @returns {Promise<Array>} Visible photos only
 */
async function getPhotosInAlbum(albumId, user) {
    const photos = await persistence.getPhotosInAlbum(albumId);
    const visiblePhotos = [];

    for (let photo of photos) {
        // Show if: public OR belongs to current user
        if (photo.visibility !== 'private' || photo.ownerID === user.ownerID) {
            visiblePhotos.push(photo);
        }
    }

    return visiblePhotos;
}

/**
 * Get photo details (no visibility check — done in route)
 * @param {number} photoId 
 * @returns {Promise<Object|null>}
 */
async function getPhotoDetails(photoId) {
    return await persistence.getPhotoDetails(photoId);
}

/**
 * Update photo fields (title, description, visibility)
 * @param {number} pid 
 * @param {string} title 
 * @param {string} description 
 * @param {string} [visibility] - 'public' or 'private'
 * @returns {Promise<boolean>} Success
 */
async function updatePhoto(pid, title, description, visibility) {
    return await persistence.updatePhoto(pid, title, description, visibility);
}

/**
 * Add a tag to a photo (idempotent)
 * @param {number} pid 
 * @param {string} tag 
 * @returns {Promise<boolean>} Success
 */
async function addTag(pid, tag) {
    return await persistence.addTag(pid, tag);
}

/**
 * Close DB connection (for CLI tool)
 */
async function close() {
    await persistence.close();
}

// business.js
async function addComment(photoId, user, text) {
    const photo = await persistence.getPhotoDetails(photoId);
    if (!photo.comments) photo.comments = [];
    photo.comments.push({ username: user.username, text, date: new Date() });
    return await persistence.updatePhotoComments(photoId, photo.comments);
}

async function getComments(photoId) {
    const photo = await persistence.getPhotoDetails(photoId);
    return photo.comments || [];
}

async function updatePhotoComments(photoId, comments) {
    return await persistence.updatePhotoComments(photoId, comments);
}

module.exports.updatePhotoComments = updatePhotoComments;

module.exports = {
    getAlbums,
    getAlbumDetails,
    getAlbumDetailsByName,
    getPhotosInAlbum,
    getPhotoDetails,
    updatePhoto,
    addTag,
    close,
    addComment,
    getComments,
    updatePhotoComments
};
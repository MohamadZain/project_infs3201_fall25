// business.js
const persistence = require('./persistence');

/**
 * Get all albums.
 * @returns {Promise<Array>} List of all albums
 */
async function getAlbums() {
    return await persistence.getAlbums();
}

/**
 * Get album details by ID.
 * @param {number} albumId - The ID of the album
 * @returns {Promise<Object>} Album details
 */
async function getAlbumDetails(albumId) {
    return await persistence.getAlbumDetails(albumId);
}

/**
 * Get album details by name.
 * @param {string} name - The name of the album
 * @returns {Promise<Object>} Album details
 */
async function getAlbumDetailsByName(name) {
    return await persistence.getAlbumDetailsByName(name);
}

/**
 * Get photos in an album that are visible to a given user.
 * @param {number} albumId - Album ID
 * @param {Object} user - User object
 * @returns {Promise<Array>} List of visible photos
 */
async function getPhotosInAlbum(albumId, user) {
    const photos = await persistence.getPhotosInAlbum(albumId);
    const visiblePhotos = [];

    for (let photo of photos) {
        if (photo.visibility !== 'private' || photo.ownerID === user.ownerID) {
            visiblePhotos.push(photo);
        }
    }

    return visiblePhotos;
}

/**
 * Get photo details by ID.
 * @param {number} photoId - Photo ID
 * @returns {Promise<Object>} Photo details
 */
async function getPhotoDetails(photoId) {
    return await persistence.getPhotoDetails(photoId);
}

/**
 * Update a photo's title, description, and visibility.
 * @param {number} pid - Photo ID
 * @param {string} title - New title
 * @param {string} description - New description
 * @param {string} [visibility] - Optional visibility
 * @returns {Promise<boolean>} True if update succeeded
 */
async function updatePhoto(pid, title, description, visibility) {
    return await persistence.updatePhoto(pid, title, description, visibility);
}

/**
 * Add a tag to a photo.
 * @param {number} pid - Photo ID
 * @param {string} tag - Tag to add
 * @returns {Promise<boolean>} True if tag added successfully
 */
async function addTag(pid, tag) {
    return await persistence.addTag(pid, tag);
}

/**
 * COMMENTS FUNCTIONS
 */

/**
 * Get all comments for a photo.
 * @param {number} photoId - Photo ID
 * @returns {Promise<Array>} List of comments
 */
async function getComments(photoId) {
    return await persistence.getComments(photoId);
}

/**
 * Add a comment to a photo.
 * @param {number} photoId - Photo ID
 * @param {string} username - Username of commenter
 * @param {string} text - Comment text
 * @returns {Promise<boolean>} True if comment added successfully
 */
async function addComment(photoId, username, text) {
    return await persistence.addComment(photoId, username, text);
}

/**
 * Close the persistence layer connection.
 */
async function close() {
    await persistence.close();
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
    addComment     
};

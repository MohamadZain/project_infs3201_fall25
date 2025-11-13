// business.js
const persistence = require('./persistence');

async function getAlbums() {
    return await persistence.getAlbums();
}

async function getAlbumDetails(albumId) {
    return await persistence.getAlbumDetails(albumId);
}

async function getAlbumDetailsByName(name) {
    return await persistence.getAlbumDetailsByName(name);
}

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

async function getPhotoDetails(photoId) {
    return await persistence.getPhotoDetails(photoId);
}

async function updatePhoto(pid, title, description, visibility) {
    return await persistence.updatePhoto(pid, title, description, visibility);
}

async function addTag(pid, tag) {
    return await persistence.addTag(pid, tag);
}

/**
 * COMMENTS FUNCTIONS
 */
async function getComments(photoId) {
    return await persistence.getComments(photoId);
}

async function addComment(photoId, username, text) {
    return await persistence.addComment(photoId, username, text);
}

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
    getComments,   // NEW
    addComment     // NEW
};

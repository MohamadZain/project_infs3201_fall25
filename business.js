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
    for (let i = 0; i < photos.length; i++) {
        if (photos[i].visibility !== 'private' || photos[i].ownerID === user.ownerID) {
            visiblePhotos.push(photos[i]);
        }
    }
    return visiblePhotos;
}

async function getPhotoDetails(photoId) {
    return await persistence.getPhotoDetails(photoId);
}

// THIS IS THE FIXED ONE — NOW ACCEPTS TAGS
async function updatePhoto(pid, title, description, visibility, tags) {
    return await persistence.updatePhoto(pid, title, description, visibility, tags);
}

async function addTag(pid, tag) {
    return await persistence.addTag(pid, tag);
}

async function getComments(photoId) {
    return await persistence.getComments(photoId);
}

async function addComment(photoId, username, text) {
    return await persistence.addComment(photoId, username, text);
}

async function close() {
    await persistence.close();
}

async function createAlbum(name, user) {
    return await persistence.createAlbum(name, user.ownerID);
}

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
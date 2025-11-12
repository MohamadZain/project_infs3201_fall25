const persistence = require('./persistence')

async function getAlbumDetails(albumId) {
    return await persistence.getAlbumDetails(albumId)
}

async function getPhotoDetails(photoId) {
    let photoDetails = await persistence.getPhotoDetails(photoId)
    if (photoDetails) {
        let albumList = []  // ← ADD let HERE
        for (let aid of photoDetails.albums) {
            let ad = await persistence.getAlbumDetails(aid)
            if (ad) {
                albumList.push(ad.name)
            }
        }
        photoDetails.albumNames = albumList
    }
    return photoDetails
}

async function updatePhoto(pid, title, description, visibility) {
    let photoDetails = await persistence.getPhotoDetails(pid)
    if (!photoDetails) {
        return undefined
    }
    return await persistence.updatePhoto(pid, title, description, visibility)
}

async function getAlbumDetailsByName(name) {
    return await persistence.getAlbumDetailsByName(name)
}

async function getPhotosInAlbum(albumId) {
    return await persistence.getPhotosInAlbum(albumId)
}

async function addTag(id, tag) {
    let details = await persistence.getPhotoDetails(id)
    if (!details) {
        return false
    }

    if (!details.tags.includes(tag)) {
        await persistence.addTag(id, tag)
        return true
    } else {
        return false
    }
}

async function close() {
    await persistence.close()
}

async function getAlbums() {
    return await persistence.getAlbums()
}

module.exports = {
    getPhotoDetails,
    getAlbumDetails,
    updatePhoto,
    getAlbums,
    getAlbumDetailsByName,
    getPhotosInAlbum,
    addTag,
    close
}
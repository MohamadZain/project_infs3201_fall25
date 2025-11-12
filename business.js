const persistence = require('./persistence')

/**
 * Get the details of the album.  The username is not considered at the moment
 * @param {*} albumId 
 * @returns 
 */
async function getAlbumDetails(albumId) {
    return await persistence.getAlbumDetails(albumId)
}

/**
 * Get details about a photo given its id.  If the photo is not found or the
 * session user does not match the id of the photo owner the function returns
 * undefined.
 * 
 * @param {*} photoId 
 * @returns 
 */
async function getPhotoDetails(photoId) {
    let photoDetails = await persistence.getPhotoDetails(photoId)
    if (photoDetails) {
        albumList = []
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

/**
 * Attempt to update the photo.  If the owner of the photo is not the person currently logged
 * in this function will not succeed and return undefined.
 * @param {\} pid 
 * @param {*} title 
 * @param {*} description 
 * @returns 
 */
async function updatePhoto(pid, title, description) {
    let photoDetails = await persistence.getPhotoDetails(pid)
    if (!photoDetails) {
        return undefined
    }
    return await persistence.updatePhoto(pid, title, description)
}

/**
 * Simple passthrough function that gets details about the album given a name.
 * @param {*} name 
 * @returns 
 */
async function getAlbumDetailsByName(name) {
    return await persistence.getAlbumDetailsByName(name)
}

/**
 * Get all the photos in the album given its id.  I am not sure if this is even being used
 * now so it should be removed or made private.
 */
async function getPhotosInAlbum(albumId) {
    return await persistence.getPhotosInAlbum(albumId)
}

/**
 * Attempt to update the photo with a new tag. If the tag is duplicated then the operation is
 * ignored.  If the owner of the file is not the person logged in the operation is also ignored.
 * @param {*} id 
 * @param {*} tag 
 * @returns 
 */
async function addTag(id, tag) {
    let details = await persistence.getPhotoDetails(id)
    if (!details) {
        return false
    }

    if (!details.tags.includes(tag)) {
        await persistence.addTag(id, tag)
        return true
    }
    else {
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
    getPhotoDetails, getAlbumDetails, updatePhoto, getAlbums,
    getAlbumDetailsByName, getPhotosInAlbum, addTag,
    close
}
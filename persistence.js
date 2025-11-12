const fs = require('fs/promises')
const mongodb = require('mongodb')

let client = undefined
let database = undefined
let photoCollection = undefined
let albumCollection = undefined

async function connectDatabase() {
    if (client) {
        return
    }
    client = new mongodb.MongoClient('mongodb+srv://student:12class34@cluster1.sjh42tn.mongodb.net/')
    db = client.db('infs3201_fall2025')
    photoCollection = db.collection('photos')
    albumCollection = db.collection('albums')
    return client
}

async function close() {
    await client.close()
}



/**
 * Find details about an album given the albumId
 * @param {*} albumId The ID to search for.
 * @returns An object with the information or undefined if the album was not found.
 */
async function getAlbumDetails(albumId) {
    await connectDatabase()
    return albumCollection.findOne({id:albumId})
}

/**
 * Find an album given its name.
 * @param {*} name The name of the album, ignoring the case
 * @returns The album or undefined if it was not found.
 */
async function getAlbumDetailsByName(name) {
    await connectDatabase()
    return await albumCollection.findOne({name:name})
}

/**
 * Get details about a photo given its ID
 * @param {*} photoId 
 * @returns An object if the photos is found or undefined if itwas not found.
 */
async function getPhotoDetails(photoId) {
    await connectDatabase()
    let photo = await photoCollection.findOne({id:photoId})
    return photo
}

/**
 * Get an array of photos in the given album.
 * @param {*} albumId 
 * @returns A list of photos. If no photos (or album) are found then the function returns
 * an empty array.
 */
async function getPhotosInAlbum(albumId) {
    await connectDatabase()
    let photoList = await photoCollection.find({albums:albumId})
    return photoList.toArray()
}

/**
 * Update a photo given its PID with the new title and description.
 * @param {*} pid 
 * @param {*} title 
 * @param {*} description 
 * @returns true if the photo was updated, false otherwise
 */
async function updatePhoto(pid, title, description) {
    await connectDatabase()
    let res = await photoCollection.updateOne(
        {id:pid}, 
        {$set: {title:title, description: description}
    })
    return res.modifiedCount == 1

}

/**
 * Add the tag to an existing photo.  This function does no validation... if the caller adds
 * multiple copies of the same name the list would contain multiple occurrences of the tag.
 * @param {*} pid 
 * @param {*} tag 
 * @returns 
 */
async function addTag(pid, tag) {
    await connectDatabase()
    let photoDetails = await getPhotoDetails(pid)
    found = false
    if (photoDetails.tags.includes(tag)) {
        return false
    }
    photoDetails.tags.push(tag)
    let res = await photoCollection.updateOne(
        {id: pid},
        {$set: {tags: photoDetails.tags}}
    )
    return res.modifiedCount == 1
}

async function getAlbums() {
    await connectDatabase()
    return await albumCollection.find().toArray()
}



module.exports = {
    getPhotoDetails, getPhotosInAlbum, getAlbumDetails, getAlbums,
    getAlbumDetailsByName, updatePhoto, addTag,
    close
}
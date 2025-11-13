const mongodb = require('mongodb')

let client = undefined
let db = undefined
let photoCollection = undefined
let albumCollection = undefined

async function connectDatabase() {
    if (client) return
    client = new mongodb.MongoClient('mongodb+srv://student:12class34@cluster1.sjh42tn.mongodb.net/')
    await client.connect()
    db = client.db('infs3201_fall2025')
    photoCollection = db.collection('photos_temp')
    albumCollection = db.collection('albums_temp')
}

async function close() {
    if (client) {
        await client.close()
        client = undefined
    }
}

async function getAlbumDetails(albumId) {
    await connectDatabase()
    return await albumCollection.findOne({ id: albumId })
}

async function getAlbumDetailsByName(name) {
    await connectDatabase()
    return await albumCollection.findOne({ name })
}

async function getPhotoDetails(photoId) {
    await connectDatabase()
    return await photoCollection.findOne({ id: photoId })
}

async function getPhotosInAlbum(albumId) {
    await connectDatabase()
    const cursor = photoCollection.find({ albums: albumId })
    return await cursor.toArray()
}

async function updatePhoto(pid, title, description, visibility) {
    await connectDatabase()
    const updateObj = { title, description }
    if (visibility) updateObj.visibility = visibility
    const res = await photoCollection.updateOne(
        { id: pid },
        { $set: updateObj }
    )
    return res.modifiedCount === 1
}

async function addTag(pid, tag) {
    await connectDatabase()
    const photo = await getPhotoDetails(pid)
    if (!photo) return false
    if (!photo.tags) photo.tags = []
    if (photo.tags.includes(tag)) return false
    photo.tags.push(tag)
    const res = await photoCollection.updateOne(
        { id: pid },
        { $set: { tags: photo.tags } }
    )
    return res.modifiedCount === 1
}

async function getAlbums() {
    await connectDatabase()
    return await albumCollection.find().toArray()
}

module.exports = {
    getPhotoDetails,
    getPhotosInAlbum,
    getAlbumDetails,
    getAlbums,
    getAlbumDetailsByName,
    updatePhoto,
    addTag,
    close
}
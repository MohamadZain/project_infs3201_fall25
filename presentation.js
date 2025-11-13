const prompt = require('prompt-sync')()
const business = require('./business')

function formatDate(iso) {
    const date = new Date(iso)
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    })
}

async function findPhoto() {
    console.log('\n\n')
    const pid = Number(prompt('Photo ID? '))
    const photoDetails = await business.getPhotoDetails(pid)
    if (photoDetails) {
        console.log(`Filename: ${photoDetails.filename}`)
        console.log(` Title: ${photoDetails.title}`)
        console.log(` Date: ${formatDate(photoDetails.date)}`)
        
        const albumList = []
        for (let aid of photoDetails.albums || []) {
            const ad = await business.getAlbumDetails(aid)
            if (ad) albumList.push(ad.name)
        }
        console.log(`Albums: ${albumList.join(', ')}`)
        console.log(` Tags: ${photoDetails.tags ? photoDetails.tags.join(', ') : ''}`)
    } else {
        console.log('!!! Photo not found')
    }
    console.log('\n\n')
}

function promptField(fieldName, current) {
    const input = prompt(`Enter value for ${fieldName} [${current}]: `)
    return input !== '' ? input : current
}

async function updatePhotoDetails() {
    console.log('\n\n')
    const pid = Number(prompt('Photo ID? '))
    const photo = await business.getPhotoDetails(pid)
    if (!photo) {
        console.log("*** not found***")
        return
    }
    console.log("Press enter to keep current value.")
    const newTitle = promptField('title', photo.title)
    const newDesc = promptField('description', photo.description)
    const result = await business.updatePhoto(pid, newTitle, newDesc)
    console.log(result ? "Photo updated" : '!!! Problem updating')
    console.log('\n\n')
}

async function albumPhotos() {
    console.log('\n\n')
    const name = prompt('What is the name of the album? ')
    const album = await business.getAlbumDetailsByName(name)
    if (!album) {
        console.log('!!! Album not found\n\n')
        return
    }
    const photos = await business.getPhotosInAlbum(album.id)
    console.log('filename,resolution,tags')
    for (let p of photos) {
        const tags = p.tags ? p.tags.join(':') : ''
        console.log(`${p.filename},${p.resolution},${tags}`)
    }
    console.log('\n\n')
}

async function tagPhoto() {
    console.log('\n\n')
    const pid = Number(prompt("What photo ID to tag? "))
    const photo = await business.getPhotoDetails(pid)
    if (!photo) {
        console.log('!!!! Photo not found')
        return
    }
    const current = photo.tags ? photo.tags.join(', ') : ''
    const tag = prompt(`What tag to add (${current})? `).trim().toLowerCase()
    if (!tag) {
        console.log('No tag entered.')
        return
    }
    const result = await business.addTag(pid, tag)
    console.log(result ? 'Updated' : 'Could not add tag')
    console.log('\n\n')
}

function getMenuSelection() {
    while (true) {
        console.log('1. Find Photo')
        console.log('2. Update Photo Details')
        console.log('3. Album Photo List')
        console.log('4. Tag Photo')
        console.log('5. Exit')
        const sel = Number(prompt('Your selection> '))
        if (sel >= 1 && sel <= 5) return sel
        console.log("**** ERROR **** select a valid option")
    }
}

async function photoApplication() {
    while (true) {
        const choice = getMenuSelection()
        if (choice === 1) await findPhoto()
        else if (choice === 2) await updatePhotoDetails()
        else if (choice === 3) await albumPhotos()
        else if (choice === 4) await tagPhoto()
        else if (choice === 5) break
    }
    await business.close()
}

photoApplication()
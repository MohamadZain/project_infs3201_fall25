const prompt = require('prompt-sync')()
const business = require('./business')

/**
 * Format an ISO date string into a readable US format.
 * @param {string} iso - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(iso) {
    const date = new Date(iso)
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    })
}

/**
 * Prompt user for a photo ID, fetch and display its details.
 * Includes filename, title, date, albums, and tags.
 */
async function findPhoto() {
    console.log('\n\n')
    const pid = Number(prompt('Photo ID? '))
    const photoDetails = await business.getPhotoDetails(pid)

    if (photoDetails) {
        console.log(`Filename: ${photoDetails.filename}`)
        console.log(` Title: ${photoDetails.title}`)
        console.log(` Date: ${formatDate(photoDetails.date)}`)

        // Collect album names for the photo
        const albumList = []
        for (let aid of photoDetails.albums || []) {
            const ad = await business.getAlbumDetails(aid)
            if (ad) albumList.push(ad.name)
        }
    let albumsStr = ''
    for (let i = 0; i < albumList.length; i++) {
        albumsStr += albumList[i]
    if (i !== albumList.length - 1) {
        albumsStr += ', '
            }
        }
console.log(`Albums: ${albumsStr}`)

    let tagsStr = ''
    if (photoDetails.tags) {
        for (let i = 0; i < photoDetails.tags.length; i++) {
        tagsStr += photoDetails.tags[i]
        if (i !== photoDetails.tags.length - 1) {
            tagsStr += ', '
            }
        }
    }

        console.log(` Tags: ${tagsStr}`)
    } else {
        console.log('!!! Photo not found')
    }
    console.log('\n\n')
}

/**
 * Prompt user for a field value; return current value if input is empty.
 * @param {string} fieldName - Name of the field to prompt
 * @param {string} current - Current value of the field
 * @returns {string} New value entered by the user or the current value
 */
function promptField(fieldName, current) {
    const input = prompt(`Enter value for ${fieldName} [${current}]: `)
    if (input !== '') {
        return input
    } else {
        return current
    }
}

/**
 * Prompt user for a photo ID and update its title/description.
 */
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
    if (result) {
        console.log("Photo updated")
    } else {
        console.log('!!! Problem updating')
    }   
    console.log('\n\n')
}

/**
 * Prompt user for album name and display all photos in that album.
 * @returns {Promise<void>}
 */
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
        // Join tags into a string if present
        tags = ''
        if (p.tags) {
        for (let i = 0; i < p.tags.length; i++) {
            tags += p.tags[i]
        if (i !== p.tags.length - 1) {
            tags += ':'
                }
             }
        }

        console.log(`${p.filename},${p.resolution},${tags}`)
    }
    console.log('\n\n')
}

/**
 * Prompt user for photo ID and add a new tag.
 */
async function tagPhoto() {
    console.log('\n\n')
    const pid = Number(prompt("What photo ID to tag? "))
    const photo = await business.getPhotoDetails(pid)
    if (!photo) {
        console.log('!!!! Photo not found')
        return
    }

    let current = ''
    if (photo.tags) {
        current = photo.tags.join(', ')
    }

    const tag = prompt(`What tag to add (${current})? `).trim().toLowerCase()
    if (!tag) {
        console.log('No tag entered.')
        return
    }

    const result = await business.addTag(pid, tag)
    if (result) {
        console.log('Updated')
    } else {
        console.log('Could not add tag')
    }    
    console.log('\n\n')
}

/**
 * Display menu and get a valid selection from the user.
 * @returns {number} Selected menu option (1-5)
 */
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

/**
 * Main application loop for photo management.
 * Loops until user chooses to exit.
 */
async function photoApplication() {
    while (true) {
        const choice = getMenuSelection()
        if (choice === 1) await findPhoto()
        else if (choice === 2) await updatePhotoDetails()
        else if (choice === 3) await albumPhotos()
        else if (choice === 4) await tagPhoto()
        else if (choice === 5) break
    }
    await business.close()  // Close DB connection when exiting
}

// Start the application
photoApplication()

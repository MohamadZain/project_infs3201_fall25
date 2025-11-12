const prompt = require('prompt-sync')()
const business = require('./business')

/**
 * Convert the date format into a standard reading format for display.
 * @param {*} iso ISO date format
 * @returns English description of the date
 */
function formatDate(iso) {
    const date = new Date(iso)
    const formatted = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    })
    return formatted
}

/**
 * The function to interact with the user and to display the details of the photo.
 */
async function findPhoto() {
    console.log('\n\n')
    let pid = Number(prompt('Photo ID? '))
    let photoDetails = await business.getPhotoDetails(pid)
    if (photoDetails) {
        console.log(`Filename: ${photoDetails.filename}`)
        console.log(` Title: ${photoDetails.title}`)
        console.log(`  Date: ${formatDate(photoDetails.date)}`)
        console.log(`Albums: ${albumList.join(', ')}`)
        console.log(`  Tags: ${photoDetails.tags.join(', ')}`)
    }
    else {
        console.log('!!! Photo not found')
    }
    console.log('\n\n')
}

/**
 * Displays a prompt asking what the new value should be. If the user just presses enter,
 * the original value will be returned.
 * @param {*} fieldName 
 * @param {*} previousValue 
 * @returns 
 */
function promptTitle(fieldName, previousValue) {
    let result = previousValue
    let newValue = prompt(`Enter value for ${fieldName} [${previousValue}]: `)
    if (newValue !== "") {
        result = newValue
    }
    return result
}



/**
 * Interact with the user to update details about he title and description of the photo.
 */
async function updatePhotoDetails() {
    console.log('\n\n')
    let pid = Number(prompt('Photo ID? '))
    let photoDetails = await business.getPhotoDetails(pid)
    if (!photoDetails) {
        console.log("*** not found***")
        return
    }
    console.log("Press enter to reuse existing value.")
    let newTitle = promptTitle('title', photoDetails.title)
    let newDescription = promptTitle('description', photoDetails.description)
    let result = await business.updatePhoto(pid, newTitle, newDescription)
    if (result) {
        console.log("Photo updated")
    }
    else {
        console.log('!!! Problem updating')
    }
    console.log('\n\n')
}

/**
 * Interact wth the user to show the photos from an album in a CSV like format.
 * @returns 
 */
async function albumPhotos() {
    console.log('\n\n')
    let albumName = prompt('What is the name of the album? ')
    let albumDetails = await business.getAlbumDetailsByName(albumName)
    if (!albumDetails) {
        console.log('!!! Album not found\n\n')
        return
    }
    let photoList = await business.getPhotosInAlbum(albumDetails.id)
    console.log('filename,resolution,tags')
    for (let p of photoList) {
        console.log(`${p.filename},${p.resolution},${p.tags.join(':')}`)
    }
    console.log('\n\n')
}

/**
 * UI function to interact with the user to ask for the photo id and the tag to apply.
 * @returns 
 */
async function tagPhoto() {
    console.log('\n\n')
    let pid = Number(prompt("What photo ID to tag? "))
    let photoDetails = await business.getPhotoDetails(pid)
    if (!photoDetails) {
        console.log('!!!! Photo not found')
        return
    }
    let tag = prompt(`What tag to add (${photoDetails.tags.join(',')})? `).toLowerCase()
    let result = await business.addTag(pid, tag)
    if (result) {
        console.log('Updated')
    }
    else {
        console.log('Could not add tag')
    }
    console.log('\n\n')
}


/**
 * Function to display the menu and get a response from the user about what they 
 * want to do. If the user types an invalid selection the program will re-prompt them.
 * @returns The item selected.
 */
function getMenuSelection() {
    while (true) {
        console.log('1. Find Photo')
        console.log('2. Update Photo Details')
        console.log('3. Album Photo List')
        console.log('4. Tag Photo')
        console.log('5. Exit')
        let selection = Number(prompt('Your selection> '))
        if (Number.isNaN(selection) || selection < 0 || selection > 5) {
            console.log("**** ERROR **** select a valid option")
        }
        else {
            return selection
        }
    }
}

/**
 * The actual photo application.
 */
async function photoApplication() {

    while (true) {
        let choice = getMenuSelection()
        if (choice === 1) {
            await findPhoto()
        }
        else if (choice === 2) {
            await updatePhotoDetails()
        }
        else if (choice === 3) {
            await albumPhotos()
        }
        else if (choice === 4) {
            await tagPhoto()
        }
        else if (choice === 5) {
            break
        }
    }
    await business.close()
}


photoApplication()
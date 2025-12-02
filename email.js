// email.js

const notifications = [];

async function sendMail(to, subject, body) {
    console.log("=== Email Notification ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    console.log("==========================");

    // Store in memory for showing notifications in UI
    notifications.push({ to, subject, body, date: new Date() });
}

function getNotifications(userEmail) {
    return notifications.filter(n => n.to === userEmail);
}

module.exports = { sendMail, getNotifications };

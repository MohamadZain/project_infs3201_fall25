// email.js

/**
 * In-memory storage for email notifications.
 * @type {Array<{to: string, subject: string, body: string, date: Date}>}
 */
const notifications = [];

/**
 * Simulate sending an email notification.
 * Logs the email to the console and stores it in memory for UI notifications.
 * @param {string} to - Recipient email address.
 * @param {string} subject - Email subject.
 * @param {string} body - Email body content.
 * @returns {Promise<void>}
 */
async function sendMail(to, subject, body) {
    console.log("=== Email Notification ===");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    console.log("==========================");

    // Store in memory for showing notifications in UI
    notifications.push({ to, subject, body, date: new Date() });
}

/**
 * Get all notifications for a specific user.
 * @param {string} userEmail - User email to filter notifications.
 * @returns {Array<{to: string, subject: string, body: string, date: Date}>} List of notifications for the user.
 */
function getNotifications(userEmail) {
    return notifications.filter(n => n.to === userEmail);
}

module.exports = { sendMail, getNotifications };

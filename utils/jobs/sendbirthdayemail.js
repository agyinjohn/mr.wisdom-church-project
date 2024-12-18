const nodemailer = require("nodemailer");
const Member = require("../../models/member_model");
const cron = require("node-cron");
const staffSchema = require("../../models/staff_model");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL, pass: process.env.PASSWORD },
});

const sendBirthdayAlerts = async () => {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Increment day to check for tomorrow's birthdays

    const tomorrowFormatted = `${
      tomorrow.getMonth() + 1
    }-${tomorrow.getDate()}`; // MM-DD format

    // Find members whose birthdays match tomorrow's date
    const birthdayMembers = await Member.find({
      dateOfBirth: { $exists: true },
    }).lean();

    const birthdaysTomorrow = birthdayMembers.filter((member) => {
      const dob = new Date(member.dateOfBirth);
      const formattedDob = `${dob.getMonth() + 1}-${dob.getDate()}`;
      return formattedDob === tomorrowFormatted;
    });

    if (birthdaysTomorrow.length === 0) {
      console.log("No birthdays tomorrow.");
      return;
    }

    // Find all staff with role 'admin'
    const adminStaff = await staffSchema.find({ role: "admin" });

    if (adminStaff.length === 0) {
      console.log("No admins to notify.");
      return;
    }

    // Prepare table content for members
    const tableRows = birthdaysTomorrow
      .map(
        (member, index) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${
              index + 1
            }</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${
              member.name
            }</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${
              member.phone || "N/A"
            }</td>
          </tr>`
      )
      .join("");

    const emailBody = `
      <p>Hello DLWC Admin,</p>
      <p>This is a reminder that tomorrow is the birthday of the following member(s):</p>

      <table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 8px; border: 1px solid #ddd;">#</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Name</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Phone Number</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <p>Best regards,</p>
      <p>Apex Dev</p>
    `;

    // Send email to all admins
    const adminEmails = adminStaff.map((admin) => admin.email);
    const mailOptions = {
      from: process.env.EMAIL,
      to: adminEmails,
      subject: "🎉 Birthday Reminder for Tomorrow",
      html: emailBody, // Use the HTML format for better display
    };

    await transporter.sendMail(mailOptions);
    console.log(`Birthday alerts sent to admins: ${adminEmails.join(", ")}`);
  } catch (error) {
    console.error("Error sending birthday alerts:", error);
  }
};

const scheduleBirthdayJob = () => {
  cron.schedule("59 59 7 * * *", () => {
    console.log("Running Birthday Reminder Job...");
    sendBirthdayAlerts();
  });
};

module.exports = scheduleBirthdayJob;

//
//

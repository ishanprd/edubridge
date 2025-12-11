import nodemailer from "nodemailer";

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export async function sendNewContentEmail({
  to,
  courseName,
  contentTitle,
  contentDescription,
  courseId,
  teacherName,
}) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || "EduPlatform"}" <${process.env.SMTP_USER}>`,
      to,
      subject: `🎓 New Content Added: ${courseName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
            .content-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 New Content Available!</h1>
            </div>
            <div class="content">
              <p>Hello Student,</p>
              
              <p>Great news! Your teacher <strong>${teacherName}</strong> has just added new content to your course:</p>
              
              <div class="content-box">
                <h2 style="margin-top: 0; color: #667eea;">📚 ${courseName}</h2>
                <h3 style="color: #555;">New Content: ${contentTitle}</h3>
                ${contentDescription ? `<p style="color: #666;">${contentDescription}</p>` : ""}
              </div>
              
              <p>Don't miss out! Check out the new content now and continue your learning journey.</p>
              
              <center>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/student/courses/${courseId}" class="button">
                  View Course Content →
                </a>
              </center>
              
              <p style="margin-top: 30px; color: #888; font-size: 14px;">
                Keep up the great work! 🚀
              </p>
            </div>
            <div class="footer">
              <p>You're receiving this email because you're subscribed to this course.</p>
              <p>© ${new Date().getFullYear()} EduPlatform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        New Content Added to ${courseName}
        
        Hello Student,
        
        Your teacher ${teacherName} has just added new content:
        
        Course: ${courseName}
        New Content: ${contentTitle}
        ${contentDescription ? `Description: ${contentDescription}` : ""}
        
        Check it out now at: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/courses/${courseId}
        
        Keep learning!
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error: error.message };
  }
}

export async function sendBulkEmails(emailData, batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < emailData.length; i += batchSize) {
    const batch = emailData.slice(i, i + batchSize);
    const batchPromises = batch.map((data) => sendNewContentEmail(data));
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
    
    if (i + batchSize < emailData.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
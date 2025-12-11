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

export async function sendLiveSessionEmail({
  to,
  courseName,
  sessionTitle,
  sessionDescription,
  startDate,
  endDate,
  roomId,
  courseId,
  teacherName,
}) {
  try {
    const transporter = createTransporter();

    const startDateTime = new Date(startDate);
    const endDateTime = endDate ? new Date(endDate) : null;
    
    const formattedStartDate = startDateTime.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedStartTime = startDateTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const durationText = endDateTime 
      ? `${formattedStartTime} - ${endDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
      : `Starting at ${formattedStartTime}`;

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || "EduPlatform"}" <${process.env.SMTP_USER}>`,
      to,
      subject: `Live Session Scheduled: ${sessionTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #111111; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
            .button:hover { background: #111111; }
            .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
            .session-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981; }
            .date-time { background: #f0fdf4; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #d1fae5; }
            .icon { display: inline-block; margin-right: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Live Session Scheduled</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Join your upcoming live class</p>
            </div>
            <div class="content">
              <p>Hello Student,</p>
              
              <p><strong>${teacherName}</strong> has scheduled a live session for your course:</p>
              
              <div class="session-box">
                <h2 style="margin-top: 0; color: #10b981;">📚 ${courseName}</h2>
                <h3 style="color: #555; margin-bottom: 15px;">${sessionTitle}</h3>
                ${sessionDescription ? `<p style="color: #666; margin-bottom: 15px;">${sessionDescription}</p>` : ""}
                
                <div class="date-time">
                  <p style="margin: 5px 0; font-weight: bold; color: #333;">
                    <span class="icon">📅</span>${formattedStartDate}
                  </p>
                  <p style="margin: 5px 0; font-weight: bold; color: #333;">
                    <span class="icon">🕐</span>${durationText}
                  </p>
                </div>
              </div>
              
              <p>Don't miss this opportunity to learn live with your instructor and interact!</p>
              
              <center>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/student/courses/${courseId}" class="button">
                  View Course Details →
                </a>
              </center>
              
              <p style="margin-top: 30px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 14px;">
                <strong>Reminder:</strong> Make sure to join a few minutes early!
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
        Live Session Scheduled
        
        Hello Student,
        
        ${teacherName} has scheduled a live session for your course:
        
        Course: ${courseName}
        Session: ${sessionTitle}
        ${sessionDescription ? `Description: ${sessionDescription}` : ""}
        
        Date: ${formattedStartDate}
        Time: ${durationText}
        
        View course details at: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/student/courses/${courseId}
        
        Don't miss it!
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Live session email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Live session email sending failed:", error);
    return { success: false, error: error.message };
  }
}

export async function sendBulkLiveSessionEmails(emailData, batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < emailData.length; i += batchSize) {
    const batch = emailData.slice(i, i + batchSize);
    const batchPromises = batch.map((data) => sendLiveSessionEmail(data));
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
    
    if (i + batchSize < emailData.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
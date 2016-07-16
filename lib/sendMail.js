const nodemailer = require("nodemailer")
  , mail = {};

mail.sendEmail = (arg, callback) => {
  const transporter = nodemailer.createTransport(`smtps://${arg.email}:${arg.password}@${arg.smtServer}`);
  const mailOptions = {
    from: `<${arg.email}>`,
    to: `<${arg.username}>`,
    subject: "New Lending Crowd Item",
    text: "There is a new loan available at lendingcrowd.co.nz",
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      callback(err, null);
    }
    else {
      callback(null, info);
    }
  });
};

module.exports = mail;

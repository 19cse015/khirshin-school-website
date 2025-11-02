const express = require('express');
const router = express.Router();
const SignupRequest = require('../models/SignupRequest');
const nodemailer = require('nodemailer');
require('dotenv').config();

router.post('/request-signup', async (req, res) => {
    const { name, email, message } = req.body;

    const newRequest = new SignupRequest({ name, email, message });
    await newRequest.save();

    // Email setup
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.ADMIN_EMAIL,
            pass: process.env.ADMIN_PASS
        }
    });

    const mailOptions = {
        from: email,
        to: process.env.ADMIN_EMAIL,
        subject: 'New Teacher Signup Request',
        text: `
New teacher signup request:
Name: ${name}
Email: ${email}
Message: ${message}

Approve this teacher:
${process.env.BASE_URL}/admin/approve/${newRequest._id}
`
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Request sent to admin. Wait for approval.' });
});

module.exports = router;

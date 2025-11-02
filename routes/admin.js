const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const SignupRequest = require('../models/SignupRequest');

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASS
  }
});

// 🟢 Signup Request (user -> admin)
router.post('/signup-request', async (req, res) => {
  try {
    const { username, password } = req.body;

    const existing = await SignupRequest.findOne({ username });
    if (existing) {
      return res.json({ success: false, message: `Your signup status is: ${existing.status}` });
    }

    const newRequest = new SignupRequest({ username, password, status: 'pending' });
    await newRequest.save();

    const approveLink = `${process.env.BASE_URL}/api/admin/approve?username=${username}`;
    const rejectLink = `${process.env.BASE_URL}/api/admin/reject?username=${username}`;

    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: '📝 New Signup Request',
      html: `
        <h3>New Signup Request</h3>
        <p><b>Username:</b> ${username}</p>
        <p>
          <a href="${approveLink}" style="color:green;">✅ Approve</a> |
          <a href="${rejectLink}" style="color:red;">❌ Reject</a>
        </p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Signup request sent. Waiting for admin approval.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ Approve user
router.get('/approve', async (req, res) => {
  try {
    const { username } = req.query;
    const request = await SignupRequest.findOne({ username });
    if (!request) return res.send('No pending request found.');

    if (request.status === 'accepted') return res.send('Already approved.');
    if (request.status === 'rejected') return res.send('This request was rejected.');

    const hash = await bcrypt.hash(request.password, 10);
    const admin = new Admin({ username, password: hash });
    await admin.save();

    request.status = 'accepted';
    await request.save();

    res.send(`✅ Request for <b>${username}</b> approved.`);
  } catch (err) {
    console.error(err);
    res.send('Error approving request.');
  }
});

// ❌ Reject user
router.get('/reject', async (req, res) => {
  try {
    const { username } = req.query;
    const request = await SignupRequest.findOne({ username });
    if (!request) return res.send('No pending request found.');

    request.status = 'rejected';
    await request.save();

    res.send(`❌ Request for <b>${username}</b> rejected.`);
  } catch (err) {
    console.error(err);
    res.send('Error rejecting request.');
  }
});

// 🔍 Check current status (Frontend auto update)
router.get('/check-status/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const request = await SignupRequest.findOne({ username });

    if (!request) return res.json({ status: 'not_found' });
    res.json({ status: request.status });
  } catch (err) {
    res.status(500).json({ status: 'error' });
  }
});

module.exports = router;

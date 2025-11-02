const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SignupRequest = require('../models/SignupRequest');

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  const approved = await SignupRequest.findOne({ email, status: 'approved' });
  if (!approved)
    return res.status(403).json({ message: 'You are not approved to sign up yet!' });

  const user = new User({ name, email, password });
  await user.save();

  res.json({ message: 'Signup successful! You can now log in.' });
});

module.exports = router;

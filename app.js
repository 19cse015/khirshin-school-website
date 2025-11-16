require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const PORT = process.env.PORT || 3002;






const connectDB = require('./db');
connectDB();

const Admin = require('./models/Admin');
const Teacher = require('./models/Teacher');
const Notice = require('./models/Notice');
const Gallery = require('./models/Gallery');
const routineRoutes = require("./models/routine");

const app = express();
app.use(cors());

// ---------------- BODY PARSER ----------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---------------- SESSION ----------------
app.use(session({
  secret: 'secret123',
  resave: false,
  saveUninitialized: true
}));




// ---------------- STATIC FOLDERS ----------------
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/css', express.static(path.join(__dirname, 'CSS')));
app.use('/', express.static(path.join(__dirname, 'views')));

// ---------------- CLOUDINARY CONFIG ----------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ---------------- MULTER + CLOUDINARY STORAGE ----------------
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = 'school_project/notices';
    const originalName = file.originalname.split('.')[0];
    const ext = file.originalname.split('.').pop();
    return {
      folder,
      format: ext,
      public_id: `${originalName}-${Date.now()}`,
      resource_type: 'auto', // important for PDF
    };
  },
});
const upload = multer({ storage });

// ---------------- AUTH MIDDLEWARE ----------------
function checkAuth(req, res, next) {
  const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

  if (req.session && req.session.admin) {
    // প্রথমবার access করলে টাইমস্ট্যাম্প বসাও
    if (!req.session.lastActivity) {
      req.session.lastActivity = Date.now();
    }

    // যদি ৫ মিনিট inactivity হয়, তাহলে logout করে login এ পাঠাও
    else if (Date.now() - req.session.lastActivity > SESSION_TIMEOUT) {
      req.session.destroy(err => {
        if (err) console.error("Session destroy error:", err);
      });
      return res.redirect('/admin/login.html');
    }

    // Activity থাকলে টাইমস্ট্যাম্প আপডেট করো
    req.session.lastActivity = Date.now();
    next();
  } else {
    res.redirect('/admin/login.html');
  }
}


// ---------------- AUTH ROUTES ----------------

app.use('/api/admin', require('./routes/admin'));


app.post('/admin/login', async (req, res) => {
  const { username, password, sharedPassword } = req.body;
  if (sharedPassword !== process.env.SHARED_PASSWORD)
    return res.json({ success: false, message: 'Invalid shared password' });

  const admin = await Admin.findOne({ username });
  if (!admin) return res.json({ success: false, message: 'Invalid username or password' });

  const match = await bcrypt.compare(password, admin.password);
  if (match) {
    req.session.admin = username;
    res.json({ success: true, message: 'Login successful!' });
  } else {
    res.json({ success: false, message: 'Invalid username or password' });
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send("Error logging out");
    res.clearCookie('connect.sid');
    res.redirect('/admin/login.html');
  });

});
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '-1');
  next();
});

// ---------------- ADMIN PAGES ----------------
app.get('/admin/login.html', (req, res) => res.sendFile(path.join(__dirname, 'ADMIN', 'login.html')));
app.get('/admin/signup.html', (req, res) => res.sendFile(path.join(__dirname, 'ADMIN', 'signup.html')));
app.get('/admin/home.html', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'ADMIN', 'home.html')));
app.get('/admin/manage-teachers.html', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'ADMIN', 'manage-teachers.html')));
app.get('/admin/manage-notices.html', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'ADMIN', 'manage-notices.html')));
app.get('/admin/manage-gallery.html', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'ADMIN', 'manage-gallery.html')));
app.get('/admin/school-timing.html', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'ADMIN', 'school-timing.html')));

// ================= TEACHER ROUTES =================

// Add Teacher
app.post('/admin/add-teacher', checkAuth, upload.single('photo'), async (req, res) => {
  try {
    const { name, subject, email, phone } = req.body;
    if (!name || !subject || !email || !phone || !req.file) {
      return res.status(400).json({ success: false, message: 'All fields and photo are required!' });
    }

    await Teacher.create({
      name,
      subject,
      email,
      phone,
      photo: req.file.path, // Cloudinary URL
    });

    res.json({ success: true, message: 'Teacher added successfully!' });
  } catch (err) {
    console.error('Error adding teacher:', err);
    res.status(500).json({ success: false, message: 'Database error while adding teacher' });
  }
});

// Delete Teacher
app.post('/admin/delete-teacher/:id', checkAuth, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    // Extract Cloudinary public_id
    const urlParts = teacher.photo.split('/');
    const fileNameWithExt = urlParts[urlParts.length - 1]; // e.g., abc123.jpg
    const public_id = 'school_project/notices/' + fileNameWithExt.split('.')[0]; // same folder as upload

    await cloudinary.uploader.destroy(public_id, { resource_type: "image" });

    // Delete from MongoDB
    await Teacher.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Teacher deleted successfully!' });
  } catch (err) {
    console.error('Error deleting teacher:', err);
    res.status(500).json({ success: false, message: 'Error deleting teacher' });
  }
});

app.put('/admin/update-teacher/:id', checkAuth, async (req, res) => {
  try {
    const { name, email, phone, subject } = req.body;
    await Teacher.findByIdAndUpdate(req.params.id, { name, email, phone, subject });
    res.json({ success: true, message: 'Teacher info updated successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error updating teacher' });
  }
});


// Get All Teachers
app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find().sort({ createdAt: -1 });
    res.json(teachers);
  } catch (err) {
    console.error('Error fetching teachers:', err);
    res.status(500).json({ success: false, message: 'Error fetching teachers' });
  }
});

// ---------------- NOTICE ROUTES ----------------
// Multer + Cloudinary Storage


// ------------------- ROUTES -------------------

// Add notice
// ---------------- NOTICE ROUTES ----------------

// Add notice
app.post('/admin/add-notice', checkAuth, upload.single('pdf_file'), async (req, res) => {
  const { title, category } = req.body;
  if (!title || !category || !req.file)
    return res.json({ success: false, message: 'All fields required' });

  try {
    const notice = await Notice.create({
      title,
      category,
      pdf_file: req.file.path.replace('/upload/', '/upload/fl_attachment:false/') // inline view fix
    });
    res.json({ success: true, message: 'Notice added successfully!', notice });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: 'Error adding notice' });
  }
});


// Get all notices
app.get('/api/notices', async (req, res) => {
  const notices = await Notice.find().sort({ createdAt: -1 });
  res.json(notices);
});

// Delete notice
app.delete('/admin/delete-notice/:id', async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.json({ success: false, message: 'Notice not found' });

    // Delete from Cloudinary if exists
    if (notice.pdf_file) {
      const publicId = notice.pdf_file
        .split('/')
        .slice(-1)[0]
        .split('.')[0]; // Extract last part before .pdf

      await cloudinary.uploader.destroy(`school_project/notices/${publicId}`, {
        resource_type: 'raw',
      });
    }

    await Notice.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notice deleted successfully' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Error deleting notice' });
  }
});



// ---------------- GALLERY ROUTES ----------------
app.post('/admin/add-gallery', checkAuth, upload.single('photo'), async (req, res) => {
  const { title } = req.body;
  if (!title || !req.file) return res.json({ success: false, message: 'Title and photo required' });

  try {
    await Gallery.create({
      title,
      filename: req.file.path // Cloudinary URL
    });
    res.json({ success: true, message: 'Image uploaded successfully!' });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: 'Database error' });
  }
});

app.post('/admin/delete-gallery/:id', checkAuth, async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Image not found" });

    // Cloudinary থেকে delete
    // Cloudinary URL থেকে public_id বের করতে হবে
    const urlParts = item.filename.split('/');
    const fileNameWithExt = urlParts[urlParts.length - 1]; // e.g., abc123.jpg
    const public_id = 'school_project/gallery/' + fileNameWithExt.split('.')[0]; // folder + file name without ext

    await cloudinary.uploader.destroy(public_id, { resource_type: "image" });

    // MongoDB থেকে delete
    await Gallery.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Image deleted successfully!' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: 'Error deleting image' });
  }
});

app.get('/api/gallery', async (req, res) => {
  const gallery = await Gallery.find().sort({ createdAt: -1 });
  res.json(gallery);
});

// ---------------- ROUTINE ROUTES ----------------
app.use("/api", routineRoutes);

// ---------------- FRONT-END ROUTES ----------------
app.get('/teachers', (req, res) => res.sendFile(path.join(__dirname, 'views', 'Teacher_list.html')));
app.get('/api/teachers', async (req, res) => {
  const teachers = await Teacher.find();
  res.json(teachers);
});

app.get('/robots.txt', (req, res) => {
  res.sendFile(__dirname + '/robots.txt');
});

app.get('/sitemap.xml', (req, res) => {
  res.sendFile(__dirname + '/sitemap.xml');
});


// ---------------- 404 ----------------
app.use((req, res) => {
  res.status(404).send('<h1>!404 Not Found </h1>');
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

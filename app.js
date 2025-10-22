require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const PORT = process.env.PORT || 3002;

const connectDB = require('./db');
connectDB();

const Admin = require('./models/Admin');
const Teacher = require('./models/Teacher');
const Notice = require('./models/Notice');
const Gallery = require('./models/Gallery');

const app = express();

// ---------------- BODY PARSER ----------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});


// ---------------- SESSION ----------------
app.use(session({
    secret: 'secret123',
    resave: false,
    saveUninitialized: true
}));

// ---------------- STATIC FOLDERS ----------------
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/css', express.static(path.join(__dirname, 'CSS')));
app.use('/', express.static(path.join(__dirname, 'views')));


app.get('/', (req, res) => res.redirect('/admin/login.html'));

// ---------------- MULTER CONFIG ----------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// ---------------- AUTH MIDDLEWARE ----------------
function checkAuth(req, res, next) {
    if (req.session.admin) next();
    else res.redirect('/admin/login.html');
}

// ---------------- AUTH ROUTES ----------------
// Signup
app.post('/admin/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hash = await bcrypt.hash(password, 10);
        const admin = new Admin({ username, password: hash });
        await admin.save();
        res.json({ success: true, message: 'Sign Up successful! Login now.' });
    } catch (err) {
        res.json({ success: false, message: 'Username already exists' });
    }
});

// Login with shared password
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
        res.clearCookie('connect.sid'); // session cookie delete
        res.redirect('/admin/login.html');
    });
});


// ---------------- ADMIN PAGES ----------------
app.get('/admin/login.html', (req, res) => res.sendFile(path.join(__dirname, 'ADMIN', 'login.html')));
app.get('/admin/signup.html', (req, res) => res.sendFile(path.join(__dirname, 'ADMIN', 'signup.html')));
app.get('/admin/home.html', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'ADMIN', 'home.html')));
app.get('/admin/manage-teachers.html', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'ADMIN', 'manage-teachers.html')));
app.get('/admin/manage-notices.html', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'ADMIN', 'manage-notices.html')));
app.get('/admin/manage-gallery.html', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'ADMIN', 'manage-gallery.html')));

// ---------------- TEACHER ROUTES ----------------
app.post('/admin/add-teacher', checkAuth, upload.single('photo'), async (req, res) => {
    const { name, email, phone, subject } = req.body;
    const photo = req.file ? req.file.filename : null;
    try {
        await Teacher.create({ name, email, phone, subject, photo });
        res.json({ success: true, message: 'Teacher added successfully!' });
    } catch (err) {
        res.json({ success: false, message: 'Error adding teacher' });
    }
});

app.get('/admin/teachers', checkAuth, async (req, res) => {
    const teachers = await Teacher.find().sort({ createdAt: -1 });
    res.json(teachers);
});

app.put('/admin/update-teacher/:id', checkAuth, upload.single('photo'), async (req, res) => {
    const { name, email, phone, subject } = req.body;
    const update = { name, email, phone, subject };
    if (req.file) update.photo = req.file.filename;
    try {
        await Teacher.findByIdAndUpdate(req.params.id, update);
        res.json({ success: true, message: 'Teacher updated successfully!' });
    } catch (err) {
        res.json({ success: false, message: 'Error updating teacher' });
    }
});

app.delete('/admin/delete-teacher/:id', checkAuth, async (req, res) => {
    try {
        await Teacher.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Teacher deleted successfully!' });
    } catch (err) {
        res.json({ success: false, message: 'Error deleting teacher' });
    }
});

// ---------------- NOTICE ROUTES ----------------
app.post('/admin/add-notice', checkAuth, upload.single('pdf_file'), async (req, res) => {
    const { title, category } = req.body;
    const pdf_file = req.file ? req.file.filename : null;
    if (!title || !category || !pdf_file) return res.json({ success: false, message: "All fields required" });

    try {
        await Notice.create({ title, category, pdf_file });
        res.json({ success: true, message: 'Notice added successfully!' });
    } catch (err) {
        res.json({ success: false, message: 'Error adding notice' });
    }
});

app.get('/api/notices', async (req, res) => {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.json(notices);
});

app.delete('/admin/delete-notice/:id', checkAuth, async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (notice && notice.pdf_file) {
            const filePath = path.join(__dirname, 'uploads', notice.pdf_file);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await Notice.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Notice deleted successfully!' });
    } catch (err) {
        res.json({ success: false, message: 'Error deleting notice' });
    }
});

// ---------------- GALLERY ROUTES ----------------
app.post('/admin/add-gallery', checkAuth, upload.single('photo'), async (req, res) => {
    const { title } = req.body;
    const filename = req.file ? req.file.filename : null;
    if (!title || !filename) return res.json({ success: false, message: 'Title and photo required' });

    try {
        await Gallery.create({ title, filename });
        res.json({ success: true, message: 'Image uploaded successfully!' });
    } catch (err) {
        res.json({ success: false, message: 'Database error' });
    }
});

app.get('/api/gallery', async (req, res) => {
    const gallery = await Gallery.find().sort({ createdAt: -1 });
    res.json(gallery);
});

app.post('/admin/delete-gallery/:id', checkAuth, async (req, res) => {
    try {
        const item = await Gallery.findById(req.params.id);
        if (item && item.filename) {
            const filePath = path.join(__dirname, 'uploads', item.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await Gallery.findByIdAndDelete(req.params.id);
        res.redirect('/admin/manage-gallery.html');
    } catch (err) {
        res.redirect('/admin/manage-gallery.html');
    }
});

// ---------------- FRONT-END ROUTES ----------------
app.get('/teachers', (req, res) => res.sendFile(path.join(__dirname, 'views', 'Teacher_list.html')));
app.get('/api/teachers', async (req, res) => {
    const teachers = await Teacher.find();
    res.json(teachers);
});

app.use((req,res)=>{
    res.send('<h1>!404 Not Found </h1>')

});

// ---------------- ROOT ----------------


// ---------------- START SERVER ----------------
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

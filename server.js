require('dotenv').config();
console.log("Shared password from env:", process.env.SHARED_PASSWORD);
const db = require('./db');

const express = require('express');
const mysql = require('mysql');

const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// ---------------- BODY PARSER ----------------
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ---------------- SESSION ----------------
app.use(session({
    secret: 'secret123',   // চাইলে .env এ রাখতে পারো
    resave: false,
    saveUninitialized: true
}));

// ---------------- STATIC FOLDERS ----------------
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/css', express.static(path.join(__dirname, 'CSS')));
app.use('/', express.static(path.join(__dirname, 'views')));

// ---------------- DATABASE ----------------
 const db = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'school_db'
    });

    db.connect(err => {
        if (err) console.error('DB connection failed:', err);
        else console.log('DB connected successfully!');
    });

    

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
app.post('/admin/signup', (req, res) => {
    const { username, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) throw err;
        db.query(
            'INSERT INTO admins (username,password) VALUES (?,?)',
            [username, hash],
            (err, result) => {
                if (err) return res.json({ success: false, message: 'Username already exists' });
                res.json({ success: true, message: 'Sign Up successful! Login now.' });
            }
        );
    });
});

// Login with shared password support
app.post('/admin/login', (req, res) => {
    const { username, password, sharedPassword } = req.body;

    if (sharedPassword !== process.env.SHARED_PASSWORD) {
        return res.json({ success: false, message: 'Invalid shared password' });
    }

    db.query('SELECT * FROM admins WHERE username=?', [username], (err, result) => {
        if (err) throw err;
        if (result.length === 0) return res.json({ success: false, message: 'Invalid username or password' });

        bcrypt.compare(password, result[0].password, (err, match) => {
            if (match) {
                req.session.admin = username;
                res.json({ success: true, message: 'Login successful!' });
            } else {
                res.json({ success: false, message: 'Invalid username or password' });
            }
        });
    });
});

// Logout
app.get('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.log("Session destroy error:", err);
            return res.send("Error logging out");
        }
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
app.post('/admin/add-teacher', checkAuth, upload.single('photo'), (req, res) => {
    const { name, email, phone, subject } = req.body;
    const photo = req.file ? req.file.filename : null;
    const sql = "INSERT INTO teachers (name,email,phone,subject,photo) VALUES (?,?,?,?,?)";
    db.query(sql, [name, email, phone, subject, photo], (err, result) => {
        if (err) return res.json({ success: false, message: 'Error adding teacher' });
        res.json({ success: true, message: 'Teacher added successfully!' });
    });
});

app.get('/admin/teachers', checkAuth, (req, res) => {
    db.query("SELECT * FROM teachers", (err, result) => {
        if (err) return res.json([]);
        res.json(result);
    });
});

app.put('/admin/update-teacher/:id', checkAuth, upload.single('photo'), (req, res) => {
    const { name, email, phone, subject } = req.body;
    let sql, values;

    if (req.file) {
        const photo = req.file.filename;
        sql = "UPDATE teachers SET name=?, email=?, phone=?, subject=?, photo=? WHERE id=?";
        values = [name, email, phone, subject, photo, req.params.id];
    } else {
        sql = "UPDATE teachers SET name=?, email=?, phone=?, subject=? WHERE id=?";
        values = [name, email, phone, subject, req.params.id];
    }

    db.query(sql, values, (err, result) => {
        if (err) return res.json({ success: false, message: 'Error updating teacher' });
        res.json({ success: true, message: 'Teacher updated successfully!' });
    });
});

app.delete('/admin/delete-teacher/:id', checkAuth, (req, res) => {
    db.query("DELETE FROM teachers WHERE id=?", [req.params.id], (err, result) => {
        if (err) return res.json({ success: false, message: 'Error deleting teacher' });
        res.json({ success: true, message: 'Teacher deleted successfully!' });
    });
});

// ---------------- NOTICE ROUTES ----------------
// ---------------- NOTICE ROUTES ----------------


// Add Notice (Upload PDF)
app.post('/admin/add-notice', checkAuth, upload.single('pdf_file'), (req, res) => {
    const { title, category } = req.body;
    const pdfFile = req.file ? req.file.filename : null;

    if (!title || !category || !pdfFile) {
        return res.json({ success: false, message: "All fields are required" });
    }

    const sql = "INSERT INTO notices (title, category, pdf_file) VALUES (?, ?, ?)";
    db.query(sql, [title, category, pdfFile], (err, result) => {
        if (err) {
            console.error("Insert Notice Error:", err);
            return res.json({ success: false, message: "Database error while saving notice" });
        }
        console.log("Notice Inserted:", result);
        res.json({ success: true, message: "Notice added successfully!" });
    });
});

// Fetch all notices
app.get('/api/notices', (req, res) => {
    db.query("SELECT * FROM notices ORDER BY created_at DESC", (err, results) => {
        if (err) {
            console.error("Fetch Notices Error:", err);
            return res.json([]);
        }
        res.json(results);
    });
});

// Delete Notice by ID
app.delete('/admin/delete-notice/:id', checkAuth, (req, res) => {
    const noticeId = req.params.id;

    // 1️⃣ প্রথমে ফাইল ডিলিট
    db.query("SELECT pdf_file FROM notices WHERE id=?", [noticeId], (err, result) => {
        if (err) {
            console.error("Select Notice Error:", err);
            return res.json({ success: false, message: "Error fetching notice" });
        }

        if (result.length > 0) {
            const filePath = path.join(__dirname, "uploads", result[0].pdf_file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // 2️⃣ তারপর database থেকে ডিলিট
        db.query("DELETE FROM notices WHERE id=?", [noticeId], (err2) => {
            if (err2) {
                console.error("Delete Notice Error:", err2);
                return res.json({ success: false, message: "Error deleting notice" });
            }
            res.json({ success: true, message: "Notice deleted successfully!" });
        });
    });
});

// ---------------- GALLERY ROUTES (Admin) ----------------


// Add Gallery Image (Admin upload)
app.post('/admin/add-gallery', checkAuth, upload.single('photo'), (req, res) => {
    const { title } = req.body;
    const photo = req.file ? req.file.filename : null;

    if (!title || !photo) {
        return res.json({ success: false, message: 'Title and photo required' });
    }

    const sql = "INSERT INTO gallery (title, filename) VALUES (?, ?)";
    db.query(sql, [title, photo], (err, result) => {
        if (err) return res.json({ success: false, message: 'Database error' });
        res.json({ success: true, message: 'Image uploaded successfully!' });
    });
});

// Get all gallery images (for Admin view)
app.get('/admin/gallery', checkAuth, (req, res) => {
    db.query("SELECT * FROM gallery ORDER BY created_at DESC", (err, results) => {
        if (err) return res.json([]);
        res.json(results);
    });
});

// Delete gallery image (Admin)
// Gallery Image Delete
app.post('/admin/delete-gallery/:id', checkAuth, (req, res) => {
    const id = req.params.id;

    // First find the filename from DB
    db.query("SELECT filename FROM gallery WHERE id = ?", [id], (err, results) => {
        if (err || results.length === 0) return res.redirect('/admin/gallery');

        const filename = results[0].filename;
        const fs = require('fs');
        const filePath = __dirname + '/uploads/' + filename;

        // Delete file from folder
        fs.unlink(filePath, (err) => {
            if (err) console.log("File delete error:", err);
        });

        // Delete record from DB
        db.query("DELETE FROM gallery WHERE id = ?", [id], (err2) => {
            if (err2) console.log("DB delete error:", err2);
            res.redirect('/admin/gallery');
        });
    });
});


// ---------------- Gallery Public API ----------------
app.get('/api/gallery', (req, res) => {
    const sql = "SELECT * FROM gallery ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching gallery:", err);
            return res.json([]);
        }
        res.json(results);
    });
});






// ---------------- FRONT-END ROUTES ----------------
app.get('/teachers', (req, res) => res.sendFile(path.join(__dirname, 'views', 'Teacher_list.html')));
app.get('/api/teachers', (req, res) => {
    const sql = "SELECT * FROM teachers";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send('Database error');
        res.json(results);
    });
});

// ---------------- ROOT ----------------
app.get('/', (req, res) => res.redirect('/admin/login.html'));

// ---------------- START SERVER ----------------
app.listen(3002, () => console.log('Server running on http://localhost:3002'));

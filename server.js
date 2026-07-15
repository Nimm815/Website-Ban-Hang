const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sql = require('mssql');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || 'ChangeThisSecret';

const htmlPages = ['index.html', 'men.html', 'women.html', 'collection.html', 'stories.html', 'about.html'];

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'HTML', 'index.html'));
});

htmlPages.forEach((page) => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML', page));
  });
});

app.use('/Images', express.static(path.join(__dirname, 'Images')));
app.use('/style.css', express.static(path.join(__dirname, 'style.css')));
app.use('/script.js', express.static(path.join(__dirname, 'script.js')));

const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true
  }
};

const poolPromise = new sql.ConnectionPool(sqlConfig)
  .connect()
  .then((pool) => {
    console.log('Connected to SQL Server');
    return pool;
  })
  .catch((err) => {
    console.error('Database Connection Failed! Bad Config: ', err);
    process.exit(1);
  });

function generateToken(user) {
  return jwt.sign({ id: user.Id, email: user.Email }, jwtSecret, { expiresIn: '12h' });
}

async function getUserByEmail(email) {
  const pool = await poolPromise;
  const result = await pool.request().input('email', sql.NVarChar, email).query('SELECT Id, Name, Email, PasswordHash FROM Users WHERE Email = @email');
  return result.recordset[0];
}

async function createUser(name, email, passwordHash) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('name', sql.NVarChar, name)
    .input('email', sql.NVarChar, email)
    .input('passwordHash', sql.NVarChar, passwordHash)
    .query('INSERT INTO Users (Name, Email, PasswordHash) OUTPUT INSERTED.Id VALUES (@name, @email, @passwordHash)');
  return result.recordset[0];
}

function buildUserResponse(user) {
  return {
    id: user.Id,
    name: user.Name,
    email: user.Email
  };
}

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Tên, email và password là bắt buộc.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password phải có ít nhất 6 ký tự.' });
  }

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email này đã được đăng ký.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await createUser(name, email, passwordHash);
    const user = { Id: inserted.Id, Name: name, Email: email };
    const token = generateToken(user);
    return res.status(201).json({ user: buildUserResponse(user), token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email và password là bắt buộc.' });
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Email hoặc password không chính xác.' });
    }

    const isMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc password không chính xác.' });
    }

    const token = generateToken(user);
    return res.json({ user: buildUserResponse(user), token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập.' });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) return res.sendStatus(403);
    req.user = decoded;
    next();
  });
}

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại.' });
    return res.json({ user: buildUserResponse(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

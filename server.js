require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const pagesRouter = require('./routes/pages');
const apiRouter = require('./routes/api');
const adminRouter = require('./routes/admin');
const accountRouter = require('./routes/account');

const app = express();
const PORT = process.env.EXPRESS_PORT || 3001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'shopmart-dev-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
);

app.use('/api', apiRouter);
app.use('/admin', adminRouter);
app.use('/account', accountRouter);
app.use('/', pagesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  const msg = err.message || 'Internal server error';
  if (req.path.startsWith('/api') || req.path.startsWith('/admin/api')) {
    return res.status(500).json({ error: msg });
  }
  res.status(500).render('error', { message: msg });
});

app.listen(PORT, () => {
  console.log(`WallNest BD running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});

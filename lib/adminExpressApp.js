const express = require('express');
const { getIronSession } = require('iron-session');
const adminRouter = require('../routes/admin');
const { sessionOptions } = require('./session');

const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(async (req, res, next) => {
  try {
    req.session = await getIronSession(req, res, sessionOptions);
    next();
  } catch (err) {
    next(err);
  }
});

app.use(adminRouter);

module.exports = app;

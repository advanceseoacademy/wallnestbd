const express = require('express');
const { requireUser } = require('../middleware/requireUser');
const { getAccountData } = require('../lib/accountService');
const { getPageContext } = require('../lib/pageContext');
const { asyncHandler } = require('../lib/asyncHandler');

const router = express.Router();

router.get(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    const [ctx, account] = await Promise.all([
      getPageContext(req),
      getAccountData(req.session.user, { sessionId: req.sessionID }),
    ]);
    const accountJson = JSON.stringify(account).replace(/</g, '\\u003c');
    res.render('account/dashboard', {
      ...ctx,
      accountJson,
    });
  })
);

module.exports = router;

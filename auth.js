// ============================================================
//  NECROSIS AI — AUTH ROUTER (auth.js)
//  Passport.js OAuth: Google · Facebook · Twitter
//  + reCAPTCHA v3 verification middleware
// ============================================================

'use strict';

const express    = require('express');
const passport   = require('passport');
const GoogleStrategy   = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const TwitterStrategy  = require('passport-twitter').Strategy;
const session    = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const fetch      = require('node-fetch');
const path       = require('path');
const DB         = require('./db');

const router = express.Router();

// ── SESSION SETUP (call this on `app` before router is used) ─

function setupSession(app) {
  app.use(session({
    store: new SQLiteStore({
      db:  'sessions.db',
      dir: path.join(__dirname, 'data'),
    }),
    secret:            process.env.SESSION_SECRET || 'necrosis-secret-change-me',
    resave:            false,
    saveUninitialized: false,
    cookie: {
      secure:   process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    },
    name: 'necrosis.sid',
  }));
  app.use(passport.initialize());
  app.use(passport.session());
}

// ── PASSPORT SERIALIZE ────────────────────────────────────────

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = DB.findById(id);
  done(null, user || false);
});

// ── GOOGLE STRATEGY ───────────────────────────────────────────

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
    scope:        ['profile', 'email'],
  }, (accessToken, refreshToken, profile, done) => {
    try {
      const user = DB.upsertOAuthUser({
        provider:      'google',
        provider_id:   profile.id,
        display_name:  profile.displayName,
        email:         profile.emails?.[0]?.value || null,
        avatar_url:    profile.photos?.[0]?.value || null,
        access_token:  accessToken,
        refresh_token: refreshToken || null,
      });
      done(null, user);
    } catch (e) { done(e); }
  }));
}

// ── FACEBOOK STRATEGY ─────────────────────────────────────────

if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID:     process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL:  process.env.FACEBOOK_CALLBACK_URL || '/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'email', 'photos'],
  }, (accessToken, refreshToken, profile, done) => {
    try {
      const user = DB.upsertOAuthUser({
        provider:      'facebook',
        provider_id:   profile.id,
        display_name:  profile.displayName,
        email:         profile.emails?.[0]?.value || null,
        avatar_url:    profile.photos?.[0]?.value || null,
        access_token:  accessToken,
        refresh_token: refreshToken || null,
      });
      done(null, user);
    } catch (e) { done(e); }
  }));
}

// ── TWITTER STRATEGY ──────────────────────────────────────────

if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
  passport.use(new TwitterStrategy({
    consumerKey:    process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL:    process.env.TWITTER_CALLBACK_URL || '/auth/twitter/callback',
    includeEmail:   true,
  }, (token, tokenSecret, profile, done) => {
    try {
      const user = DB.upsertOAuthUser({
        provider:      'twitter',
        provider_id:   profile.id,
        display_name:  profile.displayName || profile.username,
        email:         profile.emails?.[0]?.value || null,
        avatar_url:    profile.photos?.[0]?.value?.replace('_normal', '') || null,
        access_token:  token,
        refresh_token: tokenSecret,
      });
      done(null, user);
    } catch (e) { done(e); }
  }));
}

// ── RECAPTCHA MIDDLEWARE ───────────────────────────────────────

async function verifyRecaptcha(req, res, next) {
  const token      = req.body?.recaptchaToken || req.query?.recaptchaToken;
  const secretKey  = process.env.RECAPTCHA_SECRET_KEY;

  // Skip if reCAPTCHA not configured or token absent
  if (!secretKey || !token) return next();

  try {
    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `secret=${secretKey}&response=${token}`,
    });
    const data = await resp.json();

    if (!data.success || (data.score !== undefined && data.score < 0.5)) {
      return res.status(403).json({ error: 'reCAPTCHA verification failed. Coba lagi.' });
    }
    next();
  } catch (e) {
    console.error('[reCAPTCHA]', e.message);
    next(); // fail open so legit users aren't blocked by network errors
  }
}

// ── AUTH GUARD (protect app routes) ──────────────────────────

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.redirect('/login.html');
}

// ── LOG SESSION HELPER ────────────────────────────────────────

function logUserSession(req, user) {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const ua = req.headers['user-agent'] || '';
    DB.logSession(user.id, ip, ua);
  } catch (_) {}
}

// ── GOOGLE ROUTES ─────────────────────────────────────────────

router.get('/google', verifyRecaptcha,
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html?error=google' }),
  (req, res) => {
    logUserSession(req, req.user);
    res.redirect('/');
  }
);

// ── FACEBOOK ROUTES ───────────────────────────────────────────

router.get('/facebook', verifyRecaptcha,
  passport.authenticate('facebook', { scope: ['email'] })
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login.html?error=facebook' }),
  (req, res) => {
    logUserSession(req, req.user);
    res.redirect('/');
  }
);

// ── TWITTER ROUTES ────────────────────────────────────────────

router.get('/twitter', verifyRecaptcha,
  passport.authenticate('twitter')
);

router.get('/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/login.html?error=twitter' }),
  (req, res) => {
    logUserSession(req, req.user);
    res.redirect('/');
  }
);

// ── LOGOUT ────────────────────────────────────────────────────

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('necrosis.sid');
      res.redirect('/login.html');
    });
  });
});

// ── SESSION INFO API ──────────────────────────────────────────

router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ authenticated: false });
  const { id, display_name, email, avatar_url, provider, created_at, last_login } = req.user;
  res.json({
    authenticated: true,
    user: { id, display_name, email, avatar_url, provider, created_at, last_login },
  });
});

router.get('/sessions', requireAuth, (req, res) => {
  const sessions = DB.getUserSessions(req.user.id);
  res.json({ sessions });
});

// ── CHAT HISTORY API (per user) ───────────────────────────────

router.get('/history/:sessionId', requireAuth, (req, res) => {
  const history = DB.getChatHistory(req.user.id, req.params.sessionId);
  res.json({ history });
});

module.exports = { router, setupSession, requireAuth, verifyRecaptcha };

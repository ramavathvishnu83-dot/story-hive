const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, 'http://localhost:3000'] : '*',
  credentials: true,
}));
// Increase JSON body limit to 10MB to support base64 proof images in reports
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── Email transporter (Gmail SMTP via App Password) ───────────────────────────
// Uses a dedicated Story Hive sender account. Failures are non-fatal.
const ADMIN_EMAILS = [
  'ramavathvishnu83@gmail.com',
  '25r21a66j9@mlrit.ac.in',
];

const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER || 'storyhive.reports@gmail.com',
    pass: process.env.MAIL_PASS || '',   // set via env var — never hard-code
  },
});

async function sendReportEmail(report, reporterUser, reportedUser) {
  const subject = `[Story Hive] New Report — ${report.reportType}`;
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#4F9CF9">⚠️ New User Report</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;font-weight:bold;color:#666">Report ID</td><td style="padding:8px">${report.id}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#666">Type</td><td style="padding:8px;color:#e53e3e;font-weight:bold">${report.reportType}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;color:#666">Reporter</td><td style="padding:8px">${reporterUser?.name || report.reporterId} (${reporterUser?.role || 'unknown'})</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#666">Reported User</td><td style="padding:8px">${reportedUser?.name || report.reportedUserId} (${reportedUser?.role || 'unknown'})</td></tr>
        <tr><td style="padding:8px;font-weight:bold;color:#666">Description</td><td style="padding:8px">${report.description}</td></tr>
        ${report.relatedStoryId ? `<tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#666">Story ID</td><td style="padding:8px">${report.relatedStoryId}</td></tr>` : ''}
        <tr><td style="padding:8px;font-weight:bold;color:#666">Timestamp</td><td style="padding:8px">${new Date(report.timestamp).toLocaleString()}</td></tr>
      </table>
      ${report.proofImage ? `<div style="margin-top:20px"><p style="font-weight:bold;color:#666;margin-bottom:8px">Proof Screenshot:</p><img src="${report.proofImage}" style="max-width:100%;border-radius:8px;border:1px solid #ddd" alt="Proof"/></div>` : ''}
      <p style="margin-top:24px;color:#888;font-size:12px">This is an automated notification from Story Hive. Please review and take appropriate action.</p>
    </div>
  `;
  try {
    await mailer.sendMail({
      from: `"Story Hive Reports" <${process.env.MAIL_USER || 'storyhive.reports@gmail.com'}>`,
      to: ADMIN_EMAILS.join(', '),
      subject,
      html,
    });
    console.log('[Report] Admin email sent successfully');
  } catch (err) {
    // Email failure is non-fatal — report is still saved
    console.warn('[Report] Email send failed (non-fatal):', err.message);
  }
}

// ── Data helpers ──────────────────────────────────────────────────────────────
const dataPath = (file) => path.join(__dirname, 'data', file);

const read = (file) => {
  try {
    const raw = fs.readFileSync(dataPath(file), 'utf8');
    if (!raw || !raw.trim()) return [];
    return JSON.parse(raw);
  }
  catch { return []; }
};

const write = (file, data) => {
  try {
    fs.writeFileSync(dataPath(file), JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`[write] Failed to write ${file}:`, err.message);
  }
};

// ── Auth ──────────────────────────────────────────────────────────────────────

// Register
app.post('/auth/register', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email and role are required' });
  }
  const users = read('users.json');
  const existing = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  // Unique name check
  const nameTaken = users.find(u => u.name.toLowerCase() === name.trim().toLowerCase());
  if (nameTaken) return res.status(400).json({ error: 'Username already taken' });

  const user = {
    id: uuidv4(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    // password stored as plain text — UI-only auth, no real security needed
    password: password || '',
    role: role || 'writer',
    followers: [],
    following: [],
    likesReceived: [],
    reviews: [],
    dealHistory: [],
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  write('users.json', users);
  // Return user without password
  const { password: _pw, ...safeUser } = user;
  res.status(201).json(safeUser);
});

// Login
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const users = read('users.json');
  const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'No account found with that email' });
  if (user.password && user.password !== password) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const { password: _pw, ...safeUser } = user;
  res.json(safeUser);
});

// ── Users ─────────────────────────────────────────────────────────────────────
app.get('/users', (req, res) => {
  const users = read('users.json').map(({ password, ...u }) => u);
  res.json(users);
});

// Search users by name — MUST be before /users/:id to avoid shadowing
app.get('/users/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) return res.json([]);
  const query = q.trim().toLowerCase();
  const users = read('users.json')
    .filter(u => u.name.toLowerCase().includes(query))
    .slice(0, 8)
    .map(({ password, ...u }) => u);
  res.json(users);
});

app.get('/users/:id', (req, res) => {
  const user = read('users.json').find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

app.post('/users', (req, res) => {
  const users = read('users.json');
  const user = {
    id: uuidv4(),
    name: req.body.name || 'Anonymous',
    role: req.body.role || 'writer',
    followers: [],
    following: [],
    likesReceived: [],
    reviews: [],
    dealHistory: [],
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  write('users.json', users);
  res.status(201).json(user);
});

app.post('/users/:id/follow/:targetId', (req, res) => {
  const users = read('users.json');
  const user = users.find(u => u.id === req.params.id);
  const target = users.find(u => u.id === req.params.targetId);
  if (!user || !target) return res.status(404).json({ error: 'User not found' });
  if (!user.following.includes(target.id)) user.following.push(target.id);
  if (!target.followers.includes(user.id)) target.followers.push(user.id);
  write('users.json', users);
  res.json({ message: 'Followed' });
});

// Follow / Unfollow (toggle)
app.post('/users/follow', (req, res) => {
  const { followerId, targetId } = req.body;
  const users = read('users.json');
  const follower = users.find(u => u.id === followerId);
  const target = users.find(u => u.id === targetId);
  if (!follower || !target) return res.status(404).json({ error: 'User not found' });
  follower.following = follower.following || [];
  target.followers = target.followers || [];
  const isFollowing = follower.following.includes(targetId);
  if (isFollowing) {
    follower.following = follower.following.filter(id => id !== targetId);
    target.followers = target.followers.filter(id => id !== followerId);
  } else {
    follower.following.push(targetId);
    target.followers.push(followerId);
  }
  write('users.json', users);
  res.json({ following: !isFollowing, follower, target });
});

// Like / Unlike profile
app.post('/users/like', (req, res) => {
  const { likerId, targetId } = req.body;
  const users = read('users.json');
  const target = users.find(u => u.id === targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });
  target.likesReceived = target.likesReceived || [];
  const alreadyLiked = target.likesReceived.includes(likerId);
  if (alreadyLiked) {
    target.likesReceived = target.likesReceived.filter(id => id !== likerId);
  } else {
    target.likesReceived.push(likerId);
  }
  write('users.json', users);
  res.json({ liked: !alreadyLiked, likesCount: target.likesReceived.length, target });
});

app.post('/users/:id/review', (req, res) => {
  const users = read('users.json');
  const target = users.find(u => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  target.reviews.push({ from: req.body.from, rating: req.body.rating, comment: req.body.comment });
  write('users.json', users);
  res.json(target);
});

// Update user profile (name, password, privacySettings)
app.patch('/users/:id', (req, res) => {
  const users = read('users.json');
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const user = users[idx];

  const { name, currentPassword, newPassword, privacySettings } = req.body;

  // Change name — enforce uniqueness
  if (name && name.trim()) {
    const trimmed = name.trim();
    const duplicate = users.find(
      u => u.id !== req.params.id &&
           u.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    const oldName = user.name;
    user.name = trimmed;

    // Propagate name change to stories
    if (oldName !== user.name) {
      const stories = read('stories.json');
      stories.forEach(s => { if (s.authorId === user.id) s.authorName = user.name; });
      write('stories.json', stories);

      // Propagate to DM thread participantNames
      const dms = read('dms.json');
      dms.forEach(t => { if (t.participantNames?.[user.id]) t.participantNames[user.id] = user.name; });
      write('dms.json', dms);
    }
  }

  // Change password
  if (newPassword) {
    if (user.password && user.password !== currentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    user.password = newPassword;
  }

  // Privacy settings
  if (privacySettings) {
    user.privacySettings = { ...(user.privacySettings || {}), ...privacySettings };
  }

  users[idx] = user;
  write('users.json', users);
  const { password: _pw, ...safeUser } = user;
  res.json(safeUser);
});

// Upload / update profile picture (base64 stored in JSON)
app.post('/users/:id/profile-pic', (req, res) => {
  const { imageData } = req.body; // base64 data URL
  if (!imageData) return res.status(400).json({ error: 'imageData is required' });

  const users = read('users.json');
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  users[idx].profileImage = imageData;
  write('users.json', users);
  const { password: _pw, ...safeUser } = users[idx];
  res.json(safeUser);
});

// Update story (PUT /stories/:id)
app.put('/stories/:id', (req, res) => {
  const { authorId, title, genre, tags, summary, fullScript } = req.body;
  const stories = read('stories.json');
  const idx = stories.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Story not found' });
  const story = stories[idx];

  if (authorId && story.authorId !== authorId) {
    return res.status(403).json({ error: 'Only the author can edit this story' });
  }

  const isSold = story.status === 'sold';

  // Sold stories: only allow summary edits
  if (!isSold) {
    if (title)  story.title  = title.trim();
    if (genre)  story.genre  = genre;
    if (tags)   story.tags   = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean);
    if (fullScript !== undefined) story.fullScript = fullScript;
  }
  // Summary always editable
  if (summary !== undefined) story.summary = summary;

  story.updatedAt = new Date().toISOString();
  stories[idx] = story;
  write('stories.json', stories);

  const result = { ...story };
  delete result.fullScript; // strip from response (not needed in dashboard)
  res.json(result);
});

// -- Stories ------------------------------------------------------------------
app.get('/stories', (req, res) => {
  let stories = read('stories.json');
  const { genre, tags } = req.query;
  if (genre) stories = stories.filter(s => s.genre.toLowerCase() === genre.toLowerCase());
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase());
    stories = stories.filter(s => s.tags.some(t => tagList.includes(t.toLowerCase())));
  }
  res.json(stories.map(({ fullScript, ...s }) => s));
});

// IMPORTANT: specific routes must come before /:id to avoid shadowing
app.get('/stories/author/:authorId', (req, res) => {
  const stories = read('stories.json').filter(s => s.authorId === req.params.authorId);
  res.json(stories.map(({ fullScript, ...s }) => s));
});

app.get('/stories/:id', (req, res) => {
  const deals = read('deals.json');
  const story = read('stories.json').find(s => s.id === req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  const { requesterId } = req.query;
  const completedDeal = deals.find(
    d => d.storyId === story.id &&
    (d.writerId === requesterId || d.directorId === requesterId) &&
    d.status === 'completed'
  );
  const result = { ...story };
  if (!completedDeal) delete result.fullScript;
  return res.json(result);
});

app.post('/stories', (req, res) => {
  const stories = read('stories.json');
  const story = {
    id: uuidv4(),
    title: req.body.title,
    summary: req.body.summary,
    genre: req.body.genre,
    tags: req.body.tags || [],
    fullScript: req.body.fullScript || '',
    authorId: req.body.authorId,
    authorName: req.body.authorName || 'Unknown',
    status: 'active',
    likes: [],
    createdAt: new Date().toISOString(),
  };
  stories.push(story);
  write('stories.json', stories);
  res.status(201).json({ ...story, fullScript: undefined });
});

// Like / Unlike story
app.post('/stories/like', (req, res) => {
  const { userId, storyId } = req.body;
  const stories = read('stories.json');
  const story = stories.find(s => s.id === storyId);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  story.likes = story.likes || [];
  const alreadyLiked = story.likes.includes(userId);
  if (alreadyLiked) {
    story.likes = story.likes.filter(id => id !== userId);
  } else {
    story.likes.push(userId);
  }
  write('stories.json', stories);
  res.json({ liked: !alreadyLiked, likesCount: story.likes.length });
});

// Delete story
app.delete('/stories/:id', (req, res) => {
  // authorId comes as a query param — DELETE body is unreliable across clients/proxies
  const authorId = req.query.authorId || req.body?.authorId;
  const storyId  = req.params.id;

  console.log(`[DELETE /stories/${storyId}] authorId=${authorId}`);

  const stories = read('stories.json');
  const story   = stories.find(s => s.id === storyId);

  if (!story) {
    return res.status(404).json({ error: 'Story not found' });
  }
  if (authorId && story.authorId !== authorId) {
    return res.status(403).json({ error: 'Only the author can delete this story' });
  }

  // Cancel any pending deals for this story
  const deals = read('deals.json');
  const activeDeals = deals.filter(d => d.storyId === storyId && d.status === 'pending');

  if (activeDeals.length > 0) {
    activeDeals.forEach(deal => {
      deal.status      = 'cancelled';
      deal.cancelledBy = authorId || story.authorId;
      deal.cancelReason = 'story_deleted';

      // Notify via DM thread if one exists
      const dms = read('dms.json');
      const threadKey = [deal.writerId, deal.directorId].sort().join('_');
      const thread = dms.find(t => t.threadKey === threadKey);
      if (thread) {
        thread.messages.push({
          id: uuidv4(),
          senderId: 'system',
          senderName: 'Story Hive',
          text: `The story "${deal.storyTitle}" was deleted by the writer. This deal has been cancelled.`,
          type: 'system',
          dealId: deal.id,
          timestamp: new Date().toISOString(),
        });
        thread.updatedAt = new Date().toISOString();
        write('dms.json', dms);
      }
    });
    write('deals.json', deals);
  }

  // Remove story
  write('stories.json', stories.filter(s => s.id !== storyId));

  // Remove story chat thread
  const chats = read('chats.json');
  write('chats.json', chats.filter(c => c.storyId !== storyId));

  console.log(`[DELETE /stories/${storyId}] deleted OK, cancelled ${activeDeals.length} deals`);

  res.json({
    message: 'Story deleted successfully',
    cancelledDeals: activeDeals.length,
  });
});
// ── Deals ─────────────────────────────────────────────────────────────────────
app.get('/deals', (req, res) => {
  const deals = read('deals.json');
  const { userId } = req.query;
  if (userId) return res.json(deals.filter(d => d.writerId === userId || d.directorId === userId));
  res.json(deals);
});

app.post('/deals/create', (req, res) => {
  const deals = read('deals.json');
  const stories = read('stories.json');
  const story = stories.find(s => s.id === req.body.storyId);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  const existing = deals.find(
    d => d.storyId === req.body.storyId && d.directorId === req.body.directorId && d.status === 'pending'
  );
  if (existing) return res.status(400).json({ error: 'Deal already exists', deal: existing });
  const deal = {
    id: uuidv4(),
    storyId: req.body.storyId,
    storyTitle: story.title,
    writerId: story.authorId,
    writerName: story.authorName,
    directorId: req.body.directorId,
    directorName: req.body.directorName || 'Unknown Director',
    writerConfirmed: false,
    directorConfirmed: true,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  deals.push(deal);
  write('deals.json', deals);

  // Auto-create a direct message thread between writer and director for this deal
  const dms = read('dms.json');
  const threadKey = [story.authorId, req.body.directorId].sort().join('_');
  let thread = dms.find(t => t.threadKey === threadKey);
  if (!thread) {
    thread = {
      id: uuidv4(),
      threadKey,
      participants: [story.authorId, req.body.directorId],
      participantNames: {
        [story.authorId]: story.authorName,
        [req.body.directorId]: req.body.directorName || 'Director',
      },
      messages: [],
      relatedDeals: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dms.push(thread);
  }
  // Link deal to thread
  if (!thread.relatedDeals) thread.relatedDeals = [];
  if (!thread.relatedDeals.includes(deal.id)) thread.relatedDeals.push(deal.id);
  thread.updatedAt = new Date().toISOString();

  // Auto system message
  const sysMsg = {
    id: uuidv4(),
    senderId: 'system',
    senderName: 'Story Hive',
    text: `Deal started for story "${story.title}". Both parties must confirm to complete.`,
    type: 'system',
    dealId: deal.id,
    timestamp: new Date().toISOString(),
  };
  thread.messages.push(sysMsg);
  write('dms.json', dms);

  res.status(201).json({ deal, threadId: thread.id });
});

app.post('/deals/confirm', (req, res) => {
  const deals = read('deals.json');
  const deal = deals.find(d => d.id === req.body.dealId);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  if (req.body.userId === deal.writerId) deal.writerConfirmed = true;
  if (req.body.userId === deal.directorId) deal.directorConfirmed = true;
  if (deal.writerConfirmed && deal.directorConfirmed) {
    deal.status = 'completed';
    const stories = read('stories.json');
    const story = stories.find(s => s.id === deal.storyId);
    if (story) { story.status = 'sold'; write('stories.json', stories); }

    // Post system message to DM thread
    const dms = read('dms.json');
    const threadKey = [deal.writerId, deal.directorId].sort().join('_');
    const thread = dms.find(t => t.threadKey === threadKey);
    if (thread) {
      thread.messages.push({
        id: uuidv4(),
        senderId: 'system',
        senderName: 'Story Hive',
        text: `🎉 Deal Completed — "${deal.storyTitle}" has been sold!`,
        type: 'system',
        dealId: deal.id,
        timestamp: new Date().toISOString(),
      });
      thread.updatedAt = new Date().toISOString();
      write('dms.json', dms);
    }
  }
  write('deals.json', deals);
  res.json(deal);
});

app.post('/deals/cancel', (req, res) => {
  const deals = read('deals.json');
  const deal = deals.find(d => d.id === req.body.dealId);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  deal.status = 'cancelled';
  deal.cancelledBy = req.body.userId;
  write('deals.json', deals);

  // Post system message
  const dms = read('dms.json');
  const threadKey = [deal.writerId, deal.directorId].sort().join('_');
  const thread = dms.find(t => t.threadKey === threadKey);
  if (thread) {
    const cancellerRole = req.body.userId === deal.writerId ? 'Writer' : 'Director';
    thread.messages.push({
      id: uuidv4(),
      senderId: 'system',
      senderName: 'Story Hive',
      text: `Deal for "${deal.storyTitle}" was cancelled by the ${cancellerRole}.`,
      type: 'system',
      dealId: deal.id,
      timestamp: new Date().toISOString(),
    });
    thread.updatedAt = new Date().toISOString();
    write('dms.json', dms);
  }

  res.json(deal);
});

// ── Story Chat (per-story public chat) ────────────────────────────────────────
app.get('/chat/:storyId', (req, res) => {
  const chats = read('chats.json');
  const chat = chats.find(c => c.storyId === req.params.storyId);
  res.json(chat || { storyId: req.params.storyId, participants: [], messages: [] });
});

app.post('/chat/send', (req, res) => {
  const chats = read('chats.json');
  let chat = chats.find(c => c.storyId === req.body.storyId);
  if (!chat) {
    chat = { storyId: req.body.storyId, participants: [], messages: [] };
    chats.push(chat);
  }
  if (!chat.participants.includes(req.body.senderId)) chat.participants.push(req.body.senderId);
  const msg = {
    id: uuidv4(),
    senderId: req.body.senderId,
    senderName: req.body.senderName || 'User',
    text: req.body.text,
    replyTo: req.body.replyTo || null,   // { id, senderName, text }
    edited: false,
    deleted: false,
    timestamp: new Date().toISOString(),
  };
  chat.messages.push(msg);
  write('chats.json', chats);
  res.status(201).json(msg);
});

// Edit a story-chat message (15-min window)
app.patch('/chat/:storyId/messages/:msgId', (req, res) => {
  const { senderId, text } = req.body;
  const chats = read('chats.json');
  const chat = chats.find(c => c.storyId === req.params.storyId);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  const msg = chat.messages.find(m => m.id === req.params.msgId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  if (msg.senderId !== senderId) return res.status(403).json({ error: 'Not your message' });
  if (msg.deleted) return res.status(400).json({ error: 'Cannot edit a deleted message' });

  const ageMs = Date.now() - new Date(msg.timestamp).getTime();
  if (ageMs > 15 * 60 * 1000) {
    return res.status(400).json({ error: 'You can only edit messages within 15 minutes' });
  }

  msg.text = text;
  msg.edited = true;
  msg.editedAt = new Date().toISOString();
  write('chats.json', chats);
  res.json(msg);
});

// Delete a story-chat message (soft delete)
app.delete('/chat/:storyId/messages/:msgId', (req, res) => {
  const senderId = req.query.senderId || req.body?.senderId;
  const chats = read('chats.json');
  const chat = chats.find(c => c.storyId === req.params.storyId);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  const msg = chat.messages.find(m => m.id === req.params.msgId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  if (msg.senderId !== senderId) return res.status(403).json({ error: 'Not your message' });

  msg.deleted = true;
  msg.text = 'This message was deleted';
  write('chats.json', chats);
  res.json(msg);
});

// ── Direct Messages (writer ↔ director threads) ───────────────────────────────

// Get all DM threads for a user
app.get('/dms', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const dms = read('dms.json');
  const threads = dms
    .filter(t => t.participants.includes(userId))
    .map(t => {
      const lastMsg = t.messages.filter(m => m.type !== 'system').slice(-1)[0]
        || t.messages.slice(-1)[0];
      const unread = t.messages.filter(
        m => m.senderId !== userId && !(m.readBy || []).includes(userId)
      ).length;
      return {
        id: t.id,
        threadKey: t.threadKey,
        participants: t.participants,
        participantNames: t.participantNames,
        participantImages: t.participantImages || {},
        lastMessage: lastMsg || null,
        unreadCount: unread,
        relatedDeals: t.relatedDeals || [],
        updatedAt: t.updatedAt,
      };
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json(threads);
});

// Get a single DM thread (by threadId or by two userIds)
app.get('/dms/thread', (req, res) => {
  const { userId, otherId, threadId } = req.query;
  const dms = read('dms.json');
  let thread;
  if (threadId) {
    thread = dms.find(t => t.id === threadId);
  } else if (userId && otherId) {
    const threadKey = [userId, otherId].sort().join('_');
    thread = dms.find(t => t.threadKey === threadKey);
  }
  if (!thread) return res.json(null);

  // Mark messages as read for this user
  let changed = false;
  thread.messages.forEach(m => {
    if (m.senderId !== userId) {
      m.readBy = m.readBy || [];
      if (!m.readBy.includes(userId)) {
        m.readBy.push(userId);
        changed = true;
      }
    }
  });
  if (changed) write('dms.json', dms);
  res.json(thread);
});

// Send a DM
app.post('/dms/send', (req, res) => {
  const { senderId, senderName, receiverId, receiverName, text, replyTo } = req.body;
  if (!senderId || !receiverId || !text) {
    return res.status(400).json({ error: 'senderId, receiverId and text are required' });
  }
  const dms = read('dms.json');
  const threadKey = [senderId, receiverId].sort().join('_');
  let thread = dms.find(t => t.threadKey === threadKey);
  if (!thread) {
    thread = {
      id: uuidv4(),
      threadKey,
      participants: [senderId, receiverId],
      participantNames: {
        [senderId]: senderName || 'User',
        [receiverId]: receiverName || 'User',
      },
      messages: [],
      relatedDeals: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dms.push(thread);
  }
  if (senderName) thread.participantNames[senderId] = senderName;
  if (receiverName) thread.participantNames[receiverId] = receiverName;

  // Keep profile images in sync
  if (!thread.participantImages) thread.participantImages = {};
  const allUsers = read('users.json');
  const senderUser   = allUsers.find(u => u.id === senderId);
  const receiverUser = allUsers.find(u => u.id === receiverId);
  if (senderUser?.profileImage)   thread.participantImages[senderId]   = senderUser.profileImage;
  if (receiverUser?.profileImage) thread.participantImages[receiverId] = receiverUser.profileImage;

  const msg = {
    id: uuidv4(),
    senderId,
    senderName: senderName || thread.participantNames[senderId] || 'User',
    receiverId,
    text,
    replyTo: replyTo || null,   // { id, senderName, text }
    edited: false,
    deleted: false,
    readBy: [senderId],
    timestamp: new Date().toISOString(),
  };
  thread.messages.push(msg);
  thread.updatedAt = new Date().toISOString();
  write('dms.json', dms);
  res.status(201).json({ message: msg, threadId: thread.id });
});

// Edit a DM (15-min window)
app.patch('/dms/messages/:msgId', (req, res) => {
  const { senderId, text } = req.body;
  const dms = read('dms.json');
  let found = null;
  let foundThread = null;
  for (const thread of dms) {
    const m = thread.messages.find(m => m.id === req.params.msgId);
    if (m) { found = m; foundThread = thread; break; }
  }
  if (!found) return res.status(404).json({ error: 'Message not found' });
  if (found.senderId !== senderId) return res.status(403).json({ error: 'Not your message' });
  if (found.deleted) return res.status(400).json({ error: 'Cannot edit a deleted message' });
  if (found.type === 'system') return res.status(400).json({ error: 'Cannot edit system messages' });

  const ageMs = Date.now() - new Date(found.timestamp).getTime();
  if (ageMs > 15 * 60 * 1000) {
    return res.status(400).json({ error: 'You can only edit messages within 15 minutes' });
  }

  found.text = text;
  found.edited = true;
  found.editedAt = new Date().toISOString();
  foundThread.updatedAt = new Date().toISOString();
  write('dms.json', dms);
  res.json(found);
});

// Delete a DM (soft delete)
app.delete('/dms/messages/:msgId', (req, res) => {
  const senderId = req.query.senderId || req.body?.senderId;
  const dms = read('dms.json');
  let found = null;
  let foundThread = null;
  for (const thread of dms) {
    const m = thread.messages.find(m => m.id === req.params.msgId);
    if (m) { found = m; foundThread = thread; break; }
  }
  if (!found) return res.status(404).json({ error: 'Message not found' });
  if (found.senderId !== senderId) return res.status(403).json({ error: 'Not your message' });
  if (found.type === 'system') return res.status(400).json({ error: 'Cannot delete system messages' });

  found.deleted = true;
  found.text = 'This message was deleted';
  foundThread.updatedAt = new Date().toISOString();
  write('dms.json', dms);
  res.json(found);
});

// Get unread count for a user
app.get('/dms/unread', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const dms = read('dms.json');
  let total = 0;
  dms.filter(t => t.participants.includes(userId)).forEach(t => {
    t.messages.forEach(m => {
      if (m.senderId !== userId && !(m.readBy || []).includes(userId)) total++;
    });
  });
  res.json({ unread: total });
});

// ── Admin middleware ──────────────────────────────────────────────────────────
const ADMIN_EMAILS_LIST = [
  'ramavathvishnu83@gmail.com',
  '25r21a66j9@mlrit.ac.in',
];

function requireAdmin(req, res, next) {
  const adminEmail = req.headers['x-admin-email'];
  if (!adminEmail || !ADMIN_EMAILS_LIST.includes(adminEmail.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ── Admin Routes ──────────────────────────────────────────────────────────────

// GET /admin/stats — overview counts
app.get('/admin/stats', requireAdmin, (req, res) => {
  const users   = read('users.json');
  const stories = read('stories.json');
  const reports = read('reports.json');
  const deals   = read('deals.json');
  res.json({
    totalUsers:    users.length,
    totalStories:  stories.length,
    totalReports:  reports.length,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    totalDeals:    deals.length,
    bannedUsers:   users.filter(u => u.banned).length,
  });
});

// GET /admin/reports — all reports with enriched user names
app.get('/admin/reports', requireAdmin, (req, res) => {
  const reports = read('reports.json');
  const users   = read('users.json');
  const stories = read('stories.json');
  const enriched = reports.map(r => {
    const reporter = users.find(u => u.id === r.reporterId);
    const reported = users.find(u => u.id === r.reportedUserId);
    const story    = r.relatedStoryId ? stories.find(s => s.id === r.relatedStoryId) : null;
    return {
      ...r,
      reporterName: reporter?.name || 'Unknown',
      reportedUserName: reported?.name || 'Unknown',
      reportedUserRole: reported?.role || 'unknown',
      storyTitle: story?.title || null,
    };
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(enriched);
});

// PUT /admin/report/:id — update report status
app.put('/admin/report/:id', requireAdmin, (req, res) => {
  const reports = read('reports.json');
  const idx = reports.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Report not found' });
  const { status, adminNote } = req.body;
  if (status) reports[idx].status = status;
  if (adminNote !== undefined) reports[idx].adminNote = adminNote;
  reports[idx].resolvedAt = new Date().toISOString();
  write('reports.json', reports);
  res.json(reports[idx]);
});

// DELETE /admin/report/:id — delete a report
app.delete('/admin/report/:id', requireAdmin, (req, res) => {
  const reports = read('reports.json');
  const filtered = reports.filter(r => r.id !== req.params.id);
  if (filtered.length === reports.length) return res.status(404).json({ error: 'Report not found' });
  write('reports.json', filtered);
  res.json({ message: 'Report deleted' });
});

// GET /admin/users — all users with report counts
app.get('/admin/users', requireAdmin, (req, res) => {
  const users   = read('users.json').map(({ password, ...u }) => u);
  const reports = read('reports.json');
  const enriched = users.map(u => ({
    ...u,
    reportCount: reports.filter(r => r.reportedUserId === u.id).length,
  }));
  res.json(enriched);
});

// PUT /admin/user/:id — ban/unban or warn user
app.put('/admin/user/:id', requireAdmin, (req, res) => {
  const users = read('users.json');
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const { banned, warned, adminNote } = req.body;
  if (banned !== undefined) users[idx].banned = banned;
  if (warned !== undefined) users[idx].warned = warned;
  if (adminNote !== undefined) users[idx].adminNote = adminNote;
  write('users.json', users);
  const { password: _pw, ...safeUser } = users[idx];
  res.json(safeUser);
});

// DELETE /admin/user/:id — remove user
app.delete('/admin/user/:id', requireAdmin, (req, res) => {
  const users = read('users.json');
  const filtered = users.filter(u => u.id !== req.params.id);
  if (filtered.length === users.length) return res.status(404).json({ error: 'User not found' });
  write('users.json', filtered);
  res.json({ message: 'User removed' });
});

// GET /admin/stories — all stories with report flags
app.get('/admin/stories', requireAdmin, (req, res) => {
  const stories = read('stories.json');
  const reports = read('reports.json');
  const enriched = stories.map(s => ({
    ...s,
    reportCount: reports.filter(r => r.relatedStoryId === s.id).length,
  }));
  res.json(enriched);
});

// DELETE /admin/story/:id — remove a story
app.delete('/admin/story/:id', requireAdmin, (req, res) => {
  const stories = read('stories.json');
  const filtered = stories.filter(s => s.id !== req.params.id);
  if (filtered.length === stories.length) return res.status(404).json({ error: 'Story not found' });
  write('stories.json', filtered);
  res.json({ message: 'Story removed' });
});

// PUT /admin/story/:id — mark story safe (clear report flag)
app.put('/admin/story/:id', requireAdmin, (req, res) => {
  const stories = read('stories.json');
  const idx = stories.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Story not found' });
  stories[idx].markedSafe = true;
  write('stories.json', stories);
  res.json(stories[idx]);
});

// ── Reports ───────────────────────────────────────────────────────────────────

const REPORT_TYPES = ['Misbehavior', 'Fraud', 'Spam', 'Inappropriate content', 'Other'];

// Submit a report
app.post('/report', async (req, res) => {
  const { reporterId, reportedUserId, reportType, description, relatedStoryId } = req.body;

  if (!reporterId || !reportedUserId || !reportType || !description?.trim()) {
    return res.status(400).json({ error: 'reporterId, reportedUserId, reportType and description are required' });
  }
  if (!REPORT_TYPES.includes(reportType)) {
    return res.status(400).json({ error: 'Invalid report type' });
  }
  if (reporterId === reportedUserId) {
    return res.status(400).json({ error: 'You cannot report yourself' });
  }

  // Rate-limit: max 3 reports per reporter per day
  const reports = read('reports.json');
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentByReporter = reports.filter(
    r => r.reporterId === reporterId && new Date(r.timestamp).getTime() > oneDayAgo
  );
  if (recentByReporter.length >= 3) {
    return res.status(429).json({ error: 'You have reached the daily report limit (3 per day). Please try again tomorrow.' });
  }

  // Prevent duplicate: same reporter + same reported user + same type within 24h
  const duplicate = recentByReporter.find(
    r => r.reportedUserId === reportedUserId && r.reportType === reportType
  );
  if (duplicate) {
    return res.status(400).json({ error: 'You have already submitted this type of report for this user today.' });
  }

  const proofImage = req.body.proofImage || null;

  const report = {
    id: uuidv4(),
    reporterId,
    reportedUserId,
    reportType,
    description: description.trim(),
    relatedStoryId: relatedStoryId || null,
    hasProof: !!proofImage,   // store flag only — don't bloat reports.json with base64
    status: 'pending',
    timestamp: new Date().toISOString(),
  };

  reports.push(report);
  write('reports.json', reports);

  // Fetch user details for the email (non-fatal if not found)
  const users = read('users.json');
  const reporterUser  = users.find(u => u.id === reporterId);
  const reportedUser  = users.find(u => u.id === reportedUserId);

  // Attach proof image only for the email (not stored in JSON)
  const reportForEmail = { ...report, proofImage };

  // Send admin email asynchronously — don't block the response
  sendReportEmail(reportForEmail, reporterUser, reportedUser);

  res.status(201).json({
    message: 'Report submitted successfully. Our admin team will review it shortly.',
    reportId: report.id,
  });
});

// Get all reports (admin use)
app.get('/reports', (req, res) => {
  const reports = read('reports.json');
  res.json(reports);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Story Hive API running on http://localhost:${PORT}`));

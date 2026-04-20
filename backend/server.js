const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ── Data helpers ──────────────────────────────────────────────────────────────
const dataPath = (file) => path.join(__dirname, 'data', file);

const read = (file) => {
  try { return JSON.parse(fs.readFileSync(dataPath(file), 'utf8')); }
  catch { return []; }
};

const write = (file, data) =>
  fs.writeFileSync(dataPath(file), JSON.stringify(data, null, 2));

// ── Users ─────────────────────────────────────────────────────────────────────
app.get('/users', (req, res) => res.json(read('users.json')));

app.get('/users/:id', (req, res) => {
  const user = read('users.json').find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
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
    dealHistory: []
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

// ── Stories ───────────────────────────────────────────────────────────────────
app.get('/stories', (req, res) => {
  let stories = read('stories.json');
  const { genre, tags } = req.query;
  if (genre) stories = stories.filter(s => s.genre.toLowerCase() === genre.toLowerCase());
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase());
    stories = stories.filter(s => s.tags.some(t => tagList.includes(t.toLowerCase())));
  }
  // Strip fullScript from list view
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
    createdAt: new Date().toISOString()
  };
  stories.push(story);
  write('stories.json', stories);
  res.status(201).json({ ...story, fullScript: undefined });
});

app.get('/stories/author/:authorId', (req, res) => {
  const stories = read('stories.json').filter(s => s.authorId === req.params.authorId);
  res.json(stories.map(({ fullScript, ...s }) => s));
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
    directorId: req.body.directorId,
    directorName: req.body.directorName || 'Unknown Director',
    writerConfirmed: false,
    directorConfirmed: true,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  deals.push(deal);
  write('deals.json', deals);
  res.status(201).json(deal);
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
  res.json(deal);
});

// ── Chat ──────────────────────────────────────────────────────────────────────
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
    timestamp: new Date().toISOString()
  };
  chat.messages.push(msg);
  write('chats.json', chats);
  res.status(201).json(msg);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Story Hive API running on http://localhost:${PORT}`));

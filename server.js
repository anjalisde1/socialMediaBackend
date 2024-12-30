// Backend: Node.js + Express.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
const corsOptions = {
    origin: 'http://localhost:3000', // Allow requests from your frontend URL
    methods: ['GET', 'POST'],
    credentials: true,
};
app.use(cors(corsOptions));

// Connect to MongoDB
mongoose.connect('mongodb+srv://anjalipandey:eLF7Q171V9YsWWi2@cluster0.gclgr.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));


const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  profilePicture: String,
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const PostSchema = new mongoose.Schema({
  content: String,
  image: String,
  video: String,
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);
const Message = mongoose.model('Message', MessageSchema);

// Register User
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login User
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, 'secret', { expiresIn: '1h' });
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update User Profile
app.put('/api/profile/:id', async (req, res) => {
    try {
      const { name, email, profilePicture } = req.body;
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id, 
        { name, email, profilePicture }, 
        { new: true } // This ensures the updated user is returned
      );
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

// Fetch Profile
app.get('/api/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('friends');
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
});

// Create Post
app.post('/api/posts', async (req, res) => {
  try {
    const { content, image, video, tags, author } = req.body;
    const post = await Post.create({ content, image, video, tags, author });
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Fetch News Feed
app.get('/api/newsfeed/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('friends');
    const posts = await Post.find({ author: { $in: user.friends } }).populate('author tags');
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send Friend Request
app.post('/api/friend-request', async (req, res) => {
  try {
    const { senderId, recipientId } = req.body;
    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);

    if (!sender || !recipient) {
      return res.status(404).json({ error: 'User not found' });
    }

    recipient.friends.push(sender._id);
    sender.friends.push(recipient._id);

    await recipient.save();
    await sender.save();

    res.status(200).json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send Message
app.post('/api/messages', async (req, res) => {
  try {
    const { sender, recipient, content } = req.body;
    const message = await Message.create({ sender, recipient, content });
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Fetch Messages
app.get('/api/messages/:userId', async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.params.userId },
        { recipient: req.params.userId },
      ],
    }).populate('sender recipient');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));

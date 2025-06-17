const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3001;

// CORS 설정 (배포 도메인에 맞게 수정하세요)
app.use(cors({
  origin: ['https://mungplanet.com', 'https://www.mungplanet.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));

app.use(bodyParser.json());
app.use('/uploads', express.static('uploads')); // 정적 파일 서빙

// 이미지 업로드 설정 (최대 10MB 제한)
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
      cb(null, uniqueName);
    }
  })
});

// 📸 이미지 업로드 API
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '이미지가 필요합니다' });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({ image_url: imageUrl });
});

// 📮 글 등록 API
app.post('/api/posts', async (req, res) => {
  try {
    const {
      name, breed, age, cause, message,
      date, password, is_public, expose_until,
      lang, image_url
    } = req.body;

    const [id] = await db('posts').insert({
      name, breed, age, cause, message,
      date, password, is_public, expose_until,
      lang, image_url
    });

    res.status(201).json({ id });
  } catch (err) {
    console.error('글 등록 실패:', err);
    res.status(500).json({ error: '등록 실패' });
  }
});

// 🗑 글 삭제 API (참고: 댓글은 삭제 안 함)
app.post('/api/posts/:id/delete', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const post = await db('posts').where({ id }).first();
    if (!post) {
      return res.status(404).json({ error: '글이 존재하지 않음' });
    }

    if (post.password !== password) {
      return res.status(403).json({ error: '비밀번호 불일치' });
    }

    await db('posts').where({ id }).del();
    res.json({ success: true });
  } catch (err) {
    console.error('글 삭제 실패:', err);
    res.status(500).json({ error: '삭제 실패' });
  }
});

// 📰 글 리스트 조회 API
app.get('/api/posts', async (req, res) => {
  try {
    console.log('🔍 [GET] /api/posts 요청 들어옴');

    const posts = await db('posts')
      .select('id', 'name', 'age', 'breed', 'cause', 'date', 'image_url', 'is_public', 'expose_until')
      .where('is_public', true)
      .andWhere(function () {
        this.whereNull('expose_until').orWhere('expose_until', '>=', new Date().toISOString().split('T')[0]);
      })
      .orderBy('created_at', 'desc');

    console.log('✅ posts 불러오기 성공:', posts.length, '개');
    res.json(posts);
  } catch (err) {
    console.error('❌ /api/posts 오류:', err);
    res.status(500).json({ error: 'DB 오류' });
  }
});

// 📰 글 상세 조회 API
app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await db('posts').where({ id: req.params.id }).first();
    if (!post) return res.status(404).json({ error: '존재하지 않음' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'DB 오류' });
  }
});

// 💬 댓글 등록 API
app.post('/api/posts/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { id: commentId, name, text, password } = req.body;

  try {
    const insertData = {
      post_id: id,
      name,
      text,
      password,
      created_at: new Date().toISOString().split('T')[0],
    };

    if (commentId) {
      insertData.id = commentId;
    }

    const [newId] = await db('comments').insert(insertData);
    res.status(201).json({ id: newId });
  } catch (err) {
    console.error('댓글 등록 실패:', err);
    res.status(500).json({ error: '댓글 등록 실패' });
  }
});

// 💬 댓글 삭제 API (작성자 또는 글 작성자만 가능)
app.post('/api/comments/:commentId/delete', async (req, res) => {
  const { commentId } = req.params;
  const { password } = req.body;

  try {
    const comment = await db('comments').where({ id: commentId }).first();
    if (!comment) {
      return res.status(404).json({ error: '댓글 없음' });
    }

    const post = await db('posts').where({ id: comment.post_id }).first();
    const isCommentWriter = comment.password === password;
    const isPostOwner = post.password === password;

    if (!isCommentWriter && !isPostOwner) {
      return res.status(403).json({ error: '비밀번호 불일치' });
    }

    await db('comments').where({ id: commentId }).del();
    res.json({ success: true });
  } catch (err) {
    console.error('댓글 삭제 실패:', err);
    res.status(500).json({ error: '삭제 실패' });
  }
});

// 💬 댓글 조회 API
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await db('comments')
      .where({ post_id: id })
      .orderBy('created_at', 'desc');

    res.json(comments);
  } catch (err) {
    console.error('댓글 조회 실패:', err);
    res.status(500).json({ error: '댓글 불러오기 실패' });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🌈 Server running at http://localhost:${PORT}`);
});

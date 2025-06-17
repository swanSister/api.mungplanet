const db = require('./db');

async function setup() {
  const hasPosts = await db.schema.hasTable('posts');
  if (!hasPosts) {
    await db.schema.createTable('posts', table => {
      table.increments('id').primary();
      table.string('name');
      table.string('breed');
      table.integer('age');
      table.string('cause');
      table.text('message');
      table.string('date');
      table.string('password');
      table.boolean('is_public').defaultTo(true);
      table.date('expose_until').nullable();
      table.string('lang').defaultTo('ko');
      table.string('image_url').nullable(); // ✅ 이미지 URL 필드 추가
      table.timestamp('created_at').defaultTo(db.fn.now());
    });    
    console.log('✅ posts 테이블 생성 완료');
  }

  const hasComments = await db.schema.hasTable('comments');
  if (!hasComments) {
    await db.schema.createTable('comments', (table) => {
      table.increments('id').primary()
      table.integer('post_id').references('id').inTable('posts').notNullable()
      table.string('name') // ✅ 추가
      table.text('text').notNullable()
      table.string('password').notNullable()
      table.timestamp('created_at').defaultTo(db.fn.now())
    })
    console.log('✅ comments 테이블 생성 완료');
  }

  process.exit();
}

setup();

/*

posts
id            INTEGER     기본키, 자동 증가
name          TEXT        반려동물 이름
breed         TEXT        견종
age           INTEGER     나이
cause         TEXT        사망 원인
message       TEXT        추모글 본문
date          TEXT        기일 (예: 2024-08-12)
password      TEXT        삭제용 4자리 비밀번호
is_public     BOOLEAN     공개 여부 (true: 공개 / false: 비공개)
expose_until  DATE        노출 유지 기한 (nullable)
created_at    TIMESTAMP   작성일시
image_url     TEXT

comments
id            INTEGER     기본키, 자동 증가
post_id       INTEGER     posts.id 참조 (외래키), 글에 연결됨
text          TEXT        댓글 내용
password      TEXT        댓글 삭제용 비밀번호
created_at    TIMESTAMP   작성일시


*/


/*
{
  "name": "찰스",
  "breed": "도베르만",
  "age": 13,
  "cause": "노환",
  "message": "고마웠어, 사랑해",
  "date": "2024-08-12",
  "password": "1234",
  "is_public": true,
  "expose_until": "2024-09-12",
  "lang": "ko",
  "image_url": "https://yourdomain.com/uploads/charles.jpg"
}

*/
const Post = require('models/post');
const { ObjectId } = require('mongoose').Types;
const Joi = require('joi');

/**
 * MiddleWare - ObjectId Check
 */
exports.checkObjectId = (ctx, next) => {
  const { id } = ctx.params;

  if(!ObjectId.isValid(id)) {
    ctx.status = 400;
    return null;
  }

  return next();
}

/**
 * MiddleWare - Login Check
 */
exports.checkLogin = (ctx, next) => {
  if (!ctx.session.logged) {
    ctx.status = 401; // Unauthorized
    return null;
  }
  return next();
};

/**
 * POST /api/posts
 * { title, body, tags }
 */
exports.write = async (ctx) => {
  const schema = Joi.object().keys({
    title: Joi.string().required(),
    body: Joi.string().required(),
    tags: Joi.array().items(Joi.string()).required()
  });

  const result = Joi.validate(ctx.request.body, schema);

  if( result.error ) {
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }

  const {title, body, tags} = ctx.request.body;
  const post = new Post({
    title, body, tags
  })

  try {
    await post.save(); // 데이터베이스에 등록합니다.

    // response post - 저장된 결과를 반환합니다.
    ctx.body = post;
  } catch (e) {

    ctx.throw(e, 500);
  }
};

/**
 * GET /api/posts
 */
exports.list = async (ctx) => {
  const page = parseInt(ctx.query.page || 1, 10); // 뒤에 들어가는 10은 진수
  const limit = parseInt(ctx.query.limit || 10, 10);
  console.log("page ", page)
  console.log("limit ", limit)
  
  const { tag } = ctx.query;
  const query = tag ? {
    tags: tag
  } : {};

  if( page < 1 ) {
    ctx.status = 400;
    return;
  }

  try {
    const posts = await Post.find(query)
      .sort({ _id: -1 }) // id 역순 정렬
      .limit(limit) // 한번에 가져오는 데이터 수 제한
      .skip((page -1) * limit) // 특정페이지를 가져오기 위해서 건너 뛸 아이템 수 
      .lean() // 반환 형식을 제이슨 형식으로 반환해 준다.
      .exec();

    // 마지막 페이지 알려주기
    const postCount = await Post.count(query).exec();
    const last_page = await Math.ceil(postCount / limit);
    ctx.set('Last-Page', last_page);

    // response post - 검색한 배열을 반환합니다. 본문 200자 이하로 줄여서...
    const limitBodyLength = post => ({
      ...post,
      body: post.body.length < 200 ? post.body : `${post.body.slice(0,200)}...` // 본문
    })
    // ctx.body = {
    //   page,
    //   limit,
    //   last_page,
    //   data: posts.map(limitBodyLength)
    // };

    console.log(`posts`);
    console.log(posts);
    ctx.body = posts.map(limitBodyLength);
  } catch(e) {
    ctx.throw(e, 500);
  }
};

/**
 * GET /api/posts/:id
 */
exports.read = async (ctx) => {
  const { id } = ctx.params;
  
  try {
    const post = await Post.findById(id).exec();

    // post가 없으면
    if(!post) {
      ctx.status = 404;
      return;
    }

    // response post - 검색한 객체를 반환합니다.
    ctx.body = post;
  } catch(e) {
    ctx.throw(e, 500);
  }

};

/**
 * DELETE /api/posts/:id
 */
exports.remove = async (ctx) => {
  const { id } = ctx.params;

  try {
    await Post.findByIdAndRemove(id).exec();

    // response 204 - 삭제가 정상 처리되었음을 알려줍니다.
    ctx.status = 204;
  } catch(e) {
    ctx.throw(e, 500);
  }

};

/**
 * PATCH /api/posts/:id
 * { title, body, tags }
 */
exports.update = async (ctx) => {
  const schema = Joi.object().keys({
    title: Joi.string(),
    body: Joi.string(),
    tags: Joi.array().items(Joi.string())
  });

  const result = Joi.validate(ctx.request.body, schema);

  if( result.error ) {
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }

  const { id } = ctx.params;

  try {
    const post = await Post.findByIdAndUpdate(id, ctx.request.body, {
      new: true
      // new 를 설정 해주어야 새롭게 변경된 객체를 반환합니다.
    }).exec();

    // post가 없으면
    if(!post) {
      ctx.status = 404;
      return;
    }

    // response post - 변경된 객체를 반환합니다.
    ctx.body = post;
  } catch(e) {
    ctx.throw(e, 500);
  }

};

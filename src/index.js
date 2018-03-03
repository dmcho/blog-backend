require('dotenv').config();

const Koa = require('koa');
const Router = require('koa-router');
const mongoose = require('mongoose');
const bodyParser = require('koa-bodyparser');
const session = require('koa-session');
const path = require('path');
const serve = require('koa-static');

const api = require('./api');
const ssr = require('./ssr');
// const clientHtml = require('../../blog-frontend/build/index.html')

const staticPath = path.join(__dirname, '../../blog-frontend/build');

const {
  PORT: port = 4000,
  MONGO_URI: mongoURI,
  COOKIE_SIGN_KEY: signKey
} = process.env;

mongoose.Promise = global.Promise;
mongoose.connect(mongoURI).then(() => {
  console.log('connected to mongodb');
}).catch((e) => {
  console.log('mongodb - connect : Error');
  console.log(e);
});

const app = new Koa();
const router = new Router();


// 라우터 설정
router.use('/api', api.routes()); // api 라우트 적용
router.get('/', ssr);

// router.get('/', (ctx) => {
//   ctx.body = clientHtml;
//   return;
// });

// bodyParser()
app.use(bodyParser());


const sessionConfig = {
  maxAge: 86400000, // 하루
  // signed: true (기본으로 설정되어 있습니다.)
};

app.use(session(sessionConfig, app));
app.keys = [signKey];

// app 인스턴스에 라우터 적용
app.use(router.routes()).use(router.allowedMethods());
app.use(serve(staticPath)); // 주의: serve 가 ssr 전에 와야 합니다
app.use(ssr);

app.listen(4000, () => {
  console.log(`listening to port ${4000}`);
});

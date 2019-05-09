var Koa     = require('.').Koa,
    http    = require('http'),
    request = require('supertest'),
    Route   = require('.').Route,
    assert  = require('assert')

async function writeCtxBodyAuthorName (ctx, next) {
    ctx.body = {
        Author: 'ZWkang'
    }
    return await next()
}
async function writeCtxBodyMuti (ctx, next) {
    ctx.body.muti = true
    return await next()
}
describe('Route#middlerware', function() {
    it('test single Route case', function(done) {
        var app = new Koa();
        var router = new Route();
        
        router.register(/\/singleMiddler/, writeCtxBodyAuthorName)
        
        app.use(router.createMiddlerware());
        request(http.createServer(app.callback()))
        .get('/singleMiddler')
        .expect(200)
        .end(function(err, res) {
            if (err) return done(err);
            assert.equal(res.body.Author, 'ZWkang', 'test author should be ZWkang')
            assert.equal(res.body.muti, void 666, 'muti shoule be undefined')
            assert.equal(res.text, '{"Author":"ZWkang"}', "not equal");
            done();
        });
    });
    it('test muti Routes case', function(done) {
        var app = new Koa();
        var router = new Route({
            muti: true
        });
        
        router.register(/\/singleMiddler/, writeCtxBodyAuthorName)
        router.register(/\/singleMiddlersTest/, writeCtxBodyMuti)
        app.use(router.createMiddlerware());
        request(http.createServer(app.callback()))
        .get('/singleMiddlersTest')
        .expect(200)
        .end(function(err, res) {
            if (err) return done(err);
            assert(res.body.Author, 'ZWkang', 'test author should be ZWkang')
            assert(res.body.muti, true, 'muti should be true')
            done();
        });
    });
    it('test default should be 404 status code', function(done) {
        var app = new Koa();
        var router = new Route();
        
        router.register(/\/singleMiddler/, writeCtxBodyAuthorName)
        router.register(/\/singleMiddlersTest/, writeCtxBodyMuti)
        app.use(router.createMiddlerware());
        request(http.createServer(app.callback()))
        .get('/iwant404')
        .expect(404)
        .end(function(err, res) {
            if (err) return done(err);
            done();
        });
    });
})


// test('test', async t => {
// 	t.is(true, 'ponies & rainbows');
// });
const Koa = require('koa')
const app = new Koa()

app.use(async (ctx, next) => {
	const start = new Date()
	await next()
	const ms = new Date() - start
	console.log(ms)
	ctx.set('X-Response-Time', `${ms}ms`)
})

app.use(async (ctx, next) => {
	const start = new Date()
	await next()
	const ms = new Date() - start
	console.log(`${ctx.method} - ${ctx.url} - ${ms}`)
})

app.use(ctx => ctx.body='test')

app.listen(3005)
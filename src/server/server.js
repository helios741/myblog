import Koa from 'koa'
const fs = require('fs')
const app = new Koa()

const Router = require('koa-router')

let home = new Router()

// 子路由1
home.get('/', async ( ctx )=>{

  ctx.body = "sdsds"
})

let router = new Router()
router.use('/', home.routes(), home.allowedMethods())

app.use(router.routes()).use(router.allowedMethods())

app.listen(3002)
console.log('[demo] route-use-middleware is starting at port 3000')
import Koa from 'koa'
import fs from 'fs'
import Router from 'koa-router'
import React from 'react'
import {createStore} from 'redux'
import {Provider} from 'react-redux'
import {renderToString} from 'react-dom/server'
const app = new Koa()
const home = new Router()
const router = new Router()

function handleRender(req, res) {
	// const store = createStore()
}
function renderFullPage(html) {
  return `
    <!doctype html>
    <html>
      <head>
        <title>Redux Universal Example</title>
      </head>
      <body>
        <div id="root">${html}</div>
        <script>
          window.__INITIAL_STATE__ = ${JSON.stringify(preloadedState)}
        </script>
        <script src="/static/bundle.js"></script>
      </body>
    </html>
    `
}

// app.use(handleRender);









// 子路由1
home.get('/', async ( ctx )=>{
	const html = renderToString(
		<div className="ctx">
			<h1>dajiahpp</h1>
		</div>
	)
	ctx.body = renderFullPage(html)
})


router.use('/', home.routes(), home.allowedMethods())

app.use(router.routes()).use(router.allowedMethods())

app.listen(3002)
console.log('[demo] route-use-middleware is starting at port 3000')
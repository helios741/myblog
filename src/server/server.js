import Koa from 'koa'
import fs from 'fs'
import path from 'path'
import koaStatic from 'koa-static'
import Router from 'koa-router'
import React from 'react'
import {createStore} from 'redux'
import {Provider} from 'react-redux'
import {renderToString} from 'react-dom/server'
import {match, RouterContext} from 'react-router'
import routes from './routes'
import rootReducer from '../static/reducers'
import Home from '../components/Home'
const app = new Koa()
const home = new Router()
const router = new Router()
// const store = createStore(rootReducer)

app.use(koaStatic(
	path.join(__dirname, '../../build')
))

function handleRender(req, res) {
	const store = createStore()

}

function renderFullPage(html, preloadedState) {
  return `
    <!doctype html>
    <html>
      <head>
        <title>Redux Universal Example</title>
      </head>
      <body>
        <div id="root">${html}</div>
        <script>
        window.__INITIAL_STATE__ = 'fghgfhfghfg'
        </script>
        <script src="/bundle.js"></script>
      </body>
    </html>
    `
}

 //window.__INITIAL_STATE__ = ${JSON.stringify(preloadedState)}
// app.use(handleRender);

app.use(async (ctx, next) => {
	console.log("test")
	let _renderProps;
	const store = createStore()
	const preloadedState = store.getState()
	console.log(preloadedState)
	const html = renderToString(
			<Provider store={store}>
				<Home />
			</Provider>
		)
	match({routes, location: ctx.url}, (err, redirectLocation, renderProps) => {
		console.log("redirectLocation: +", redirectLocation)
		 _renderProps = renderProps
	})
	console.log(_renderProps)
	ctx.body = renderFullPage(html, preloadedState)
	
	// if (_renderProps) {
	// 	await ctx.render('index', {
	// 		root: renderToString(
	// 			<Provider>
	// 				<RouterContext {..._renderProps} />
	// 			</Provider>
	// 		),
	// 		state: store.getState()
	// 	})
	// } else {
	// 	await next()
	// }
})



// 子路由1
home.get('/', async ( ctx )=>{
	const html = renderToString(
		<h1>dsdsd</h1>
	)
	console.log(1)
	ctx.body = renderFullPage(html)
})


router.use('/', home.routes(), home.allowedMethods())

app.use(router.routes()).use(router.allowedMethods())

app.listen(3002)
console.log('[demo] route-use-middleware is starting at port 3000')
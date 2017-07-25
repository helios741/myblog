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
import reducer from '../static/reducers'
const app = new Koa()
const home = new Router()
const router = new Router()


app.use(koaStatic(
	path.join(__dirname, '../../build')
))


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
        window.__INITIAL_STATE__ = ${JSON.stringify(preloadedState)}
        </script>
        <script src="/bundle.js"></script>
      </body>
    </html>
    `
}

//window.__INITIAL_STATE__ = ${JSON.stringify(preloadedState)}

app.use(async (ctx, next) => {
	let _renderProps;
	
	match({routes, location: ctx.url}, (err, redirectLocation, renderProps) => {
		console.log("redirectLocation: +", redirectLocation)
		_renderProps = renderProps
	})
	console.log(_renderProps)
	
	if (_renderProps) {
		await ctx.render('index-test', {
			root: renderToString(
				<Provider>
					<RouterContext {..._renderProps} />
				</Provider>
			),
			state: store.getState()
		})
	} else {
		await next()
	}
})



// 子路由1
home.get('/', async ( ctx )=>{
	const store = createStore(reducer)
	const preloadedState = store.getState()
	const html = renderToString(
			<Provider store={store}>
				<Home />
			</Provider>
		)
	ctx.body = renderFullPage(html, preloadedState)
})


router.use('/', home.routes(), home.allowedMethods())

app.use(router.routes()).use(router.allowedMethods())

app.listen(3002)
console.log('[demo] route-use-middleware is starting at port 3000')
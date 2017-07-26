import Koa from 'koa'
import fs from 'fs'
import path from 'path'
import koaStatic from 'koa-static'
import Router from 'koa-router'
import views from 'koa-views'
import React from 'react'
import {createStore} from 'redux'
import {Provider} from 'react-redux'
import {renderToString} from 'react-dom/server'
import {match, RouterContext} from 'react-router'
import routes from '../routes'
import reducer from '../reducers'
import clientRoute from './middlewares/clientRoute'
const app = new Koa()
const home = new Router()
const router = new Router()


app.use(koaStatic(
	path.join(__dirname, '../../build')
))

app.use(views(path.resolve(__dirname, '../views'), {map: {html: 'ejs'}}))

app.use(clientRoute)


app.use(router.routes()).use(router.allowedMethods())

app.listen(3002)
console.log('[demo] route-use-middleware is starting at port 3002')
import fs from 'fs'
import path from 'path'
import Router from 'koa-router'
import user from '../controllers/user'

const router = new Router({prefix: '/api'})


fs.readdirSync(__dirname)
	.filter(filename => filename !== path.basename(__filename) )
	.forEach(filename =>{

		const subRouter = new Router({prefix: '/user'})
		subRouter.get('/getuser', user.getUserInfo)
		router.use(subRouter.routes(), subRouter.allowedMethods())
	} )

export default router
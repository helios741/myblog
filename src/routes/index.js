import React from 'react'
import Common from '../components/Common'
import Home from '../components/Home'
import Explore from '../components/Explore'
import About from '../components/About'


const routes = [
	{
		path: '/',
		component: Home
	},{
		path: '/common',
		component: Common
	},{
		path: '/explore',
		component: Explore
	},{
		path: '/about',
		component: About
	}
]

export default routes 
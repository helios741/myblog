import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import {Router} from 'react-router'
import { hashHistory, match, browserHistory } from 'react-router';
import configureStore from './store/configureStore'
import routes from '../routes'

const store = configureStore();
const preloadedState = window.__INITIAL_STATE__
console.log(preloadedState)

debugger
match({history: browserHistory, routes}, (error, redirectLocation, renderProps) => {
	console.log("renderProps:",renderProps)	
	console.log(routes)
	render(
		<Provider store={store}>
			<Router {...renderProps} />
		</Provider>,
		document.getElementById('root')
	)
})
// <RouteMap history={hashHistory} />
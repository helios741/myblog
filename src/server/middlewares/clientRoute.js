import {renderToString} from 'react-dom/server'
import {match, RouterContext} from 'react-router'
import {Provider} from 'react-redux'
import routes from '../../routes'
import reducer from '../../reducers'
import createStore from '../../store/configureStore'

export default async (ctx, next) => {
	let _renderProps;
	const store = createStore(reducer)
	match({routes, location: ctx.url}, (err, redirectLocation, renderProps) => {
		_renderProps = renderProps
	})
	
	if (_renderProps) {
		ctx.render('index', {
			root: renderToString(
				<Provider store={store}>
					<RouterContext {..._renderProps} />
				</Provider>
			),
			state: store.getState()
		})
	} else {
		await next()
	}
}
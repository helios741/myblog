import {createStore} from 'redux'
import rootReducer from '../reducers'

export default function configureStore(initState={   00000}) {
	const store = createStore(rootReducer, initState, 
				//window.devToolsExtension ? window.devToolsExtension() : undefined
				undefined
			)
	return store
}
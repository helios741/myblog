const initState = [];

export default function store (state=initState, action) {
	switch(action.type) {
		case 'NEW':
			return {...state, name:'helios'}
		default:
			return state;
	}
}
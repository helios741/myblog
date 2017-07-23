const initState = {}

export default function userinfo(state=initState, action) {
	switch(action.type) {
		case 'UPDATE':
			return action.data;
		default:
			return state;
	}
}
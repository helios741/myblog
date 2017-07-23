async function getUserInfo(ctx) {
	ctx.body = {
		name: 'helios',
		gender: 'male',
		age: 21
	}

}

export default {getUserInfo}
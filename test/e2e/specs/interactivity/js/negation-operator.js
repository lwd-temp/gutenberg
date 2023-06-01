const { store } = window.wp.interactivity;

store( {
	selectors: {
		active: ( { state } ) => {
			return state.active;
		},
	},
	state: {
		active: false,
	},
	actions: {
		toggle: ( { state } ) => {
			state.active = ! state.active;
		},
	},
} );

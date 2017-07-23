import React from 'react'
import PureRenderMixin from 'react-addons-pure-render-mixin'

class Explore extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
    }
    render() {
        return (
            <h1>Explore</h1>
        )
    }
}

export default Explore
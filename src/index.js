import React from './react';
// import ReactDOM from 'react-dom';
import {createElement} from './element'

let el = createElement('ul', {
  id: 'wrapper',
  onClick: () => {console.log('hello')},
  style: {backgroundColor: 'red'}
},
createElement('li', {}, 'a'),
createElement('li', {}, 'b')
)

// class Counter extends React.Component {
//   constructor (props) {
//     super(props);
//     this.state = {number: 0}
//   }
//   //WARNING! To be deprecated in React v17. Use componentDidMount instead.
//   componentWillMount() {
//     console.log('组件将要挂载')
//   }
//   componentDidMount() {
//     console.log('组件挂载完成')
//     // setTimeout(() => {
//     //   this.increment()
//     // }, 2000);
//   }
//   shouldComponentUpdate(nextProps, nextState) {
//     return true
//   }
//   componentDidUpdate(prevProps, prevState) {
//     console.log('组件更新')
//   }
//   increment = () => {
//     this.setState({
//       number: this.state.number + 1
//     })
//   }
//   render() {
//     return (
//       createElement('div', {id: 'counter'},
//         createElement('p', {}, this.state.number),
//         createElement('button', {onClick: this.increment}, '+')
//       )
//       // this.state.number
//     );
//   }
// }

class Counter extends React.Component {
  constructor(props) {
    super();
    this.props = props;
    this.state = {
      odd: true
    }
  }
  componentDidMount() {
    setTimeout(() => {
      this.setState({
        odd: false
      })
    }, 1000);
  }
  render() {
    if (this.state.odd) {
      return createElement('ul', {}, 
        createElement('li', {key: 'a'}, 'a'),
        createElement('li', {key: 'b'}, 'b'),
        createElement('li', {key: 'c'}, 'c')
      )
    } else {
      return createElement('ul', {}, 
        createElement('li', {key: 'b'}, 'b'),
        createElement('li', {key: 'c'}, 'c'),
        createElement('li', {key: 'e'}, 'e')
      )
    }
  }
}

// {type: Counter, props: {name: '计数器'}}
React.render(createElement(Counter, {name: '计数器'}), document.getElementById('root'));

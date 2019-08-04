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


React.render(el, document.getElementById('root'));

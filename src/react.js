import $ from 'jquery';
import {createUnit} from './unit'
import {Component} from './Component'

const React = {
  render,
  reactid: 0,
  Component
}

function render (el, container) {
  let unit = createUnit(el);
  let markUp = unit.getMarkUp(0)
  $(container).html(markUp)
  // container.innerHTML = `<span data-reactid="${React.reactid}">${el}</span>`
}

export default React

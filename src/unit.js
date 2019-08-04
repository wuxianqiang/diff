import { Element } from './element'
import $ from 'jquery'

class Unit {
  constructor(el) {
    this._currentElement = el;
  }
  getMarkUp() {
    console.log('这是抽象类')
  }
}

class TextUnit extends Unit {
  getMarkUp(reactid) {
    this._reactid = reactid;
    return `<span data-reactid="${reactid}">${this._currentElement}</span>`
  }
}

class compositeUnit extends Unit {
  getMarkUp(reactid) {
    this._reactid = reactid;
    // {type: Counter, props: {name: '计数器'}}
    let {type: Component, props} = this._currentElement;
    // 实例化组件
    let componentInstance = new Component(props);
    // 调用render
    let renderedElement = componentInstance.render();
    // reander方法里面返回的就是虚拟DOM，交给创建单元
    let renderedUnit = createUnit(renderedElement)
    return renderedUnit.getMarkUp(reactid)
  }
}


class NativeUnit extends Unit {
  getMarkUp(reactid) {
    this._reactid = reactid;
    // 虚拟DOM变成真实DOM再添加到页面上
    let {type, props} = this._currentElement;
    let el = `[data-reactid="${reactid}"]`
    let tagStart = `<${type} data-reactid="${reactid}"`;
    let tagEnd = `</${type}>`;
    let childString = '';
    for (let propName in props) {
      let value = props[propName]
      if (/^on[A-Z]/.test(propName)) {
        let eventName = propName.slice(2).toLowerCase()
        $(document).delegate(el, `${eventName}.${reactid}`, value)
      } else if (propName === 'style') {
        // { backgroundColor: 'read' }
        // { background-color: 'read' }
        let styles = Object.entries(value).map(([k, v]) => {
          k = k.replace(/[A-Z]/g, (matched) => {
            return `-${matched.toLowerCase()}`
          })
          return `${k}:${v}`
        }).join(';')
        tagStart += ` style=${styles} `;
      } else if (propName === 'children') {
        // 处理里面的子元素
        // eslint-disable-next-line no-loop-func
        value.forEach((child, index) => {
          // 注意：这里重新调用了getMarkUp，递归获取的操作
          let childUnit = createUnit(child)
          let childMarkUp = childUnit.getMarkUp(`${reactid}.${index}`)
          childString += childMarkUp
        })
      } else {
        tagStart += ` ${propName}=${value} `
      }
    }
    return `${tagStart}>${childString}${tagEnd}`
  }
}

function createUnit(el) {
  let isType = typeof el;
  if (['string', 'number'].includes(isType)) {
    return new TextUnit(el)
  }
  // 注意：通过type判断的是普通的DOM对象
  isType = typeof el.type;
  if (el instanceof Element && isType === 'string') {
    return new NativeUnit(el)
  }
  // 类组件 Counter是个类， {type: Counter, props: {name: '计数器'}}
  if (el instanceof Element && isType === 'function') {
    return new compositeUnit(el)
  }
}

export {
  createUnit
}

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
  update(nextElement) {
    // 修改当前元素的指向
    if (this._currentElement !== nextElement) {
      this._currentElement = nextElement
      $(`[data-reactid="${this._reactid}"]`).html(nextElement)
    }
  }
}

class compositeUnit extends Unit {
  // setState里面调用的update，负责更新操作
  update (nextElement, partialState) {
    // 先获取新的元素
    this._currentElement = nextElement || this._currentElement;
    // 获取新的状态
    // 注意这行代码
    // let componentInstance = this._componentInstance = new Component(props);
    // 不管要不要更新组件，组件的状态一定会修改，this._componentInstance.state必须重新赋值
    let nextState = this._componentInstance.state = Object.assign(this._componentInstance.state, partialState);
    let nextProps = this._currentElement.props;
    // 询问组件是否要更新
    if (
      this._componentInstance.shouldComponentUpdate && 
      !this._componentInstance.shouldComponentUpdate(nextProps, nextState)) {
      return
    }
    // 下面要进行比较
    let preRenderedUnitInstance = this._renderedUnitInstance;
    // 上次渲染的react元素
    let preRenderedElement = preRenderedUnitInstance._currentElement;
    // 重新调用render得到了新的react元素
    let nextRenderElement = this._componentInstance.render()
    // 对比两个元素，都是react元素，虚拟DOM
    // 如果两个元素的类型一样，则可以深度比较
    if (shouldDeepCompare(preRenderedElement, nextRenderElement)) {
      // 调用对应单元的update方法
      preRenderedUnitInstance.update(nextRenderElement);
      // 执行生命周期
      this._componentInstance.componentDidUpdate && this._componentInstance.componentDidUpdate()
    } else {
      // 重新创建这颗树
      this._renderedUnitInstance = createUnit(nextRenderElement)
      let nextMarkUp = this._renderedUnitInstance.getMarkUp(this._reactid);
      // 替换掉
      $(`[data-reactid="${this._reactid}"]`).replaceWith(nextMarkUp)
    }
  }
  getMarkUp(reactid) {
    this._reactid = reactid;
    // {type: Counter, props: {name: '计数器'}}
    let {type: Component, props} = this._currentElement;
    // 实例化组件
    // 当前单元增加了_componentInstance，当前组件实例
    let componentInstance = this._componentInstance = new Component(props);
    // 组件实例增加currentUnit指向单元
    this._componentInstance._currentUnit = this;
    // 执行生命周期函数
    componentInstance.componentWillMount && componentInstance.componentWillMount()
    // 调用render
    let renderedElement = componentInstance.render();
    // reander方法里面返回的就是虚拟DOM，交给创建单元
    // 当前单元增加了_renderedUnitInstance，当前创建react元素的unit
    let renderedUnitInstance = this._renderedUnitInstance = createUnit(renderedElement)
    $(document).on('mounted', () => {
      componentInstance.componentDidMount && componentInstance.componentDidMount()
    })
    return renderedUnitInstance.getMarkUp(reactid)
  }
}
// 比较两个元素一样不一样
function shouldDeepCompare (oldElement, newElement) {
  if (oldElement != null && newElement != null) {
    let oldType = typeof oldElement;
    let newType = typeof newElement;
    // 第一步判断文本
    if (['number', 'string'].includes(oldType) && ['number', 'string'].includes(newType)) {

    }
    // 第二部判断react元素
    if (oldElement instanceof Element && newElement instanceof Element) {

    }
  }
  return false
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

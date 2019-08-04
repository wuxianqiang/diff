import $ from 'jquery';
// 差异更新的几种类型
var UPDATE_TYPES = {
  MOVE_EXISTING: 1,
  REMOVE_NODE: 2,
  INSERT_MARKUP: 3
};
// 全局的更新深度标识
var updateDepth = 0;
// 全局的更新队列，所有的差异都存在这里
var diffQueue = [];
class Component {
  constructor(props) {
    this.props = props;
  }
  setState(newState) {
    // setState 主要调用了对应的receivePropsAndState 来实现更新,所有的挂载，更新都应该交给对应的 component 来管理

    this.reactCompositeInstance.receiveComponent(null, newState);
  }
}

const React = {
  nextReactRootIndex: 0,
  render,
  createElement,
  Component
}
/**
 * React.render 作为入口接受一个React元素和浏览器中的DOM负责调用渲染
 * nextReactRootIndex 为每个 component 的生成唯一标识
 * @param {*} element React元素
 * @param {*} container 目标容器的DOM节点
 */
function render(element, container) {
  //instantiateReactComponent 用来根据 element 的类型,返回一个 component 的实例,是一个工厂函数
  let componentInstance = instantiateReactComponent(element);
  //mountComponent方法用于对组件的渲染,返回组件的DOM结构
  let markup = componentInstance.mountComponent(React.nextReactRootIndex++);
  //把组装好的DOM放入container容器中
  $(container).html(markup);
  $(document).trigger("mounted");
}
class ReactElement {
  constructor(type, props) {
    this.type = type;
    this.key = props.key;
    this.props = props;
  }
}
/**
 * 创建虚拟DOM节点
 * @param {} type 
 * @param {*} props 
 * @param  {...any} children 
 */
function createElement(type, props = {}, ...children) {
  props.children = children;
  return new ReactElement(type, props);
}

function instantiateReactComponent(element) {
  if (typeof element == 'string' || typeof element == 'number') {
    return new ReactDOMTextComponent(element);
  }
  if (typeof element == 'object' && typeof element.type == 'string') {
    return new ReactDOMComponent(element);
  }
  // 自定义的元素节点
  if (typeof element === "object" && typeof element.type === "function") {
    // 注意这里，使用新的component,专门针对自定义元素
    return new ReactCompositeComponent(element);
  }
}
class ReactCompositeComponent {
  constructor(element) {
    this.element = element;
  }
  mountComponent(rootID) {
    this.rootID = rootID;
    let {
      type,
      props
    } = this.element;
    //创建Counter组件的实例
    let componentInstance = this.componentInstance = new type(props);
    //创建一个指针指向当前ReactCompositeComponent实例
    componentInstance.reactCompositeInstance = this;
    if (componentInstance.componentWillMount) {
      componentInstance.componentWillMount();
    }
    let renderedElement = componentInstance.render();
    this.renderedComponentInstance = instantiateReactComponent(renderedElement);
    var renderedMarkup = this.renderedComponentInstance.mountComponent(rootID);
    $(document).on("mounted", function () {
      componentInstance.componentDidMount && componentInstance.componentDidMount();
    });
    return renderedMarkup;
  }
  receiveComponent(nextElement, newState) {
    //如果接收了新的元素，就使用最新的element Counter 这是虚拟DOM
    this.element = nextElement || this.element;
    //把新的状态合并到老的实例的状态上 instance=couter
    let nextState = Object.assign(this.componentInstance.state, newState);
    //新的属性
    var nextProps = this.element.props;
    //给组件重新赋新的状态
    this.componentInstance.state = nextState;
    if (
      this.componentInstance.shouldComponentUpdate &&
      this.componentInstance.shouldComponentUpdate(nextProps, nextState) === false
    ) {
      // 如果实例的 shouldComponentUpdate 返回 false，则不需要继续往下执行更新
      return;
    }
    if (this.componentInstance.componentWillUpdate)
      this.componentInstance.componentWillUpdate(nextProps, nextState);
    //获取老的组件实例
    let prevRenderedComponentInstance = this.renderedComponentInstance;
    //获取老的虚拟DOM
    let prevRenderedElement = prevRenderedComponentInstance.element;
    // 通过新的状态对象重新执行render拿到对应的新element
    var nextRenderedElement = this.componentInstance.render();
    //判断是需要更新还是直接就重新渲染
    if (shouldUpdateReactComponent(prevRenderedElement, nextRenderedElement)) {
      //如果需要更新，就继续调用子节点的receiveComponent的方法，传入新的element更新子节点。
      prevRenderedComponentInstance.receiveComponent(nextRenderedElement);
      this.componentInstance.componentDidUpdate && this.componentInstance.componentDidUpdate();
    } else {
      //如果发现完全是不同的两种element，那就干脆重新渲染了
      //重新new一个对应的component，
      this._renderedComponent = this._instantiateReactComponent(nextRenderedElement);
      //重新生成对应的元素内容
      let nextMarkup = this._renderedComponent.mountComponent(this.rootID);
      //替换整个节点
      $('[data-reactid="' + this.rootID + '"]').replaceWith(nextMarkup);
    }
  }
}

function shouldUpdateReactComponent(prevElement, nextElement) {
  if (prevElement != null && nextElement != null) {
    let prevType = typeof prevElement;
    let nextType = typeof nextElement;
    if (prevType === 'string' || prevType === 'number') {
      return nextType === 'string' || nextType === 'number';
    } else {
      return nextType === 'object' && prevElement.type === nextElement.type;
    }
  }
  return false;
}
class ReactDOMTextComponent {
  constructor(element) {
    this.element = element;
  }
  mountComponent(rootID) {
    this.rootID = rootID;
    return `<span data-reactid="${rootID}">${this.element}</span>`;
  }
  receiveComponent(newElement) {
    if (this.element != newElement) {
      this.element = newElement;
      $(`[data-reactid="${this.rootID}"]`).html(this.element);
    }
  }
}
class ReactDOMComponent {
  constructor(element) {
    this.element = element;
  }
  mountComponent(rootID) {
    this.rootID = rootID;
    let {
      type,
      props
    } = this.element;
    var tagOpen = `<${type} data-reactid=${rootID} `;
    var tagClose = `</${type}>`;
    let content = '';
    var childrenInstances = []; //用于保存所有的子节点的componet实例，以后会用到
    for (var propKey in props) {
      if (/on[A-Za-z]+/.test(propKey)) {
        var eventType = propKey.slice(2).toLowerCase();
        $(document).delegate(
          `[data-reactid="${rootID}"]`,
          `${eventType}.${rootID}`,
          props[propKey]
        );
      } else if (propKey === 'children') {
        let children = props.children || [];
        children.forEach((child, idx) => {
          let childComponentInstance = instantiateReactComponent(child);
          childComponentInstance._mountIndex = idx;
          childrenInstances.push(childComponentInstance);
          var childMarkup = childComponentInstance.mountComponent(`${rootID}.${idx}`);
          content += ` ` + childMarkup;
        });
      } else {
        tagOpen += ` ${propKey}=${props[propKey]}`;
      }
    }
    this._renderedChildren = childrenInstances;
    return tagOpen + '>' + content + tagClose;
  }
  receiveComponent(nextElement) {
    var lastProps = this.element.props;
    var nextProps = nextElement.props;
    //需要单独的更新属性
    this._updateDOMProperties(lastProps, nextProps);
    //再更新子节点
    this._updateDOMChildren(nextElement.props.children);
  }
  _updateDOMProperties(lastProps, nextProps) {
    //遍历，当一个老的属性不在新的属性集合里时，需要删除掉。
    var propKey;
    for (propKey in lastProps) {
      //新的属性里有，或者propKey是在原型上的直接跳过。这样剩下的都是不在新属性集合里的。需要删除
      if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey)) {
        continue;
      }
      //对于那种特殊的，比如这里的事件监听的属性我们需要去掉监听
      if (/^on[A-Za-z]/.test(propKey)) {
        var eventType = propKey.slice(2).toLowerCase();
        //针对当前的节点取消事件代理
        $(document).undelegate(`[data-reactid="${this.rootID}"]`, eventType, lastProps[propKey]);
        continue;
      }

      //从dom上删除不需要的属性
      $(`[data-reactid="${this.rootID}"]`).removeAttr(propKey);
    }
    //对于新的属性，需要写到dom节点上
    for (propKey in nextProps) {
      //对于事件监听的属性我们需要特殊处理
      if (/^on[A-Za-z]/.test(propKey)) {
        var eventType = propKey.slice(2).toLowerCase();
        //以前如果已经有，说明有了监听，需要先去掉
        lastProps[propKey] && $(document).undelegate(`[data-reactid="${this.rootID}"]`, eventType, lastProps[propKey]);
        //针对当前的节点添加事件代理,以_rootNodeID为命名空间
        $(document).delegate(`[data-reactid="${this.rootID}"]`, eventType, lastProps[propKey]);
        continue;
      }

      if (propKey == 'children') continue;
      //添加新的属性，或者是更新老的同名属性
      $(`[data-reactid="${this.rootID}"]`).prop(propKey, nextProps[propKey])
    }

  }
  _updateDOMChildren(nextChildrenElements) {
    updateDepth++;
    // _diff用来递归找出差别,组装差异对象,添加到更新队列diffQueue。
    this._diff(diffQueue, nextChildrenElements);
    updateDepth--;
    if (updateDepth == 0) {
      // 在需要的时候调用patch，执行具体的dom操作
      this._patch(diffQueue);
      diffQueue = [];
    }
  }
  //diff内部也会递归调用子节点的receiveComponent
  //于是当某个子节点也是浏览器普通节点，就也会走_updateDOMChildren这一步
  //_diff用来递归找出差别,组装差异对象,添加到更新队列diffQueue。
  _diff(diffQueue, nextChildrenElements) {
    //拿到之前的子节点的 component类型对象的集合,这个是在刚开始渲染时赋值的
    //_renderedChildren 本来是数组，我们搞成map key是索引，值是元素
    let prevChildren = this.flattenChildren(this._renderedChildren);
    //生成新的子节点的component对象集合，这里注意，会复用老的component对象
    var nextChildren = this.generateComponentChildren(
      prevChildren,
      nextChildrenElements
    );
    //重新赋值_renderedChildren
    this._renderedChildren = [];
    $.each(nextChildren, (key, instance) => {
      this._renderedChildren.push(instance);
    });
    let lastIndex = 0;//代表访问的最后一次的老的集合的位置
    let nextIndex = 0; //代表到达的新的节点的index
    //通过对比两个集合的差异，组装差异节点添加到队列中
    for (let name in nextChildren) {
      //先获取老节点
      let prevChild = prevChildren && prevChildren[name];
      //再获取新节点
      var nextChild = nextChildren[name];
      //相同的话，说明是使用的同一个component,所以我们需要做移动的操作
      if (prevChild === nextChild) {
        //添加差异对象，类型：MOVE_EXISTING
        prevChild._mountIndex < lastIndex && diffQueue.push({
          parentId: this.rootID,
          parentNode: $(`[data-reactid='${this.rootID}']`),
          type: UPDATE_TYPES.MOVE_EXISTING,
          fromIndex: prevChild._mountIndex,
          toIndex: nextIndex
        })
        lastIndex = Math.max(prevChild._mountIndex, lastIndex);
      } else { //如果不相同，说明是新增加的节点
        //但是如果老的还存在，就是element不同，但是component一样。我们需要把它对应的老的element删除。
        if (prevChild) {
          //添加差异对象，类型：REMOVE_NODE
          diffQueue.push({
            parentId: this.rootID,
            parentNode: $(`[data-reactid='${this.rootID}']`),
            type: UPDATE_TYPES.REMOVE_NODE,
            fromIndex: prevChild._mountIndex,
            toIndex: null
          })

          //如果以前已经渲染过了，记得先去掉以前所有的事件监听，通过命名空间全部清空
          if (prevChild.rootID) {
            $(document).undelegate(`[data-reactid="${this.rootID}"]`);
          }
          lastIndex = Math.max(prevChild._mountIndex, lastIndex);
        }
        diffQueue.push({
          parentId: this.rootID,
          parentNode: $(`[data-reactid="${this.rootID}"]`),
          type: UPDATE_TYPES.INSERT_MARKUP,
          fromIndex: null,
          toIndex: nextIndex,
          markup: nextChild.mountComponent(`${this.rootID}.${nextIndex}`) //新增的节点，多一个此属性，表示新节点的dom内容
        })

      }
      //更新mount的index
      nextChild._mountIndex = nextIndex;
      nextIndex++;
    }
    //对于老的节点里有，新的节点里没有的那些，也全都删除掉
    for (let name in prevChildren) {
      if (prevChildren.hasOwnProperty(name) && !(nextChildren && nextChildren.hasOwnProperty(name))) {
        //添加差异对象，类型：REMOVE_NODE
        let prevChild = prevChildren[name];
        diffQueue.push({
          parentId: this.rootID,
          parentNode: $(`[data-reactid="${this.rootID}"]`),
          type: UPDATE_TYPES.REMOVE_NODE,
          fromIndex: prevChild._mountIndex,
          toIndex: null
        })
        //如果以前已经渲染过了，记得先去掉以前所有的事件监听
        if (prevChildren[name].rootID) {
          $(document).undelegate(`[data-reactid="${this.rootID}"]`);
        }
      }
    }

  }
  _patch(diffQueue) {
    var initialChildren = {};
    var deleteChildren = [];
    for (var i = 0; i < diffQueue.length; i++) {
      let update = diffQueue[i];
      if (update.type === UPDATE_TYPES.MOVE_EXISTING || update.type === UPDATE_TYPES.REMOVE_NODE) {
        var updatedIndex = update.fromIndex;
        var updatedChild = $(update.parentNode.children().get(updatedIndex));
        var parentId = update.parentId;
        //所有需要更新的节点都保存下来，方便后面使用
        initialChildren[parentId] = initialChildren[parentId] || [];
        //使用parentID作为简易命名空间
        initialChildren[parentId][updatedIndex] = updatedChild;
        //所有需要修改的节点先删除,对于move的，后面再重新插入到正确的位置即可
        deleteChildren.push(updatedChild)
      }
    }

    //删除所有需要先删除的
    $.each(deleteChildren, function (index, child) {
      $(child).remove();
    })


    //再遍历一次，这次处理新增的节点，还有修改的节点这里也要重新插入
    for (var k = 0; k < diffQueue.length; k++) {
      let update = diffQueue[k];
      switch (update.type) {
        case UPDATE_TYPES.INSERT_MARKUP:
          this.insertChildAt(update.parentNode, $(update.markup), update.toIndex);
          break;
        case UPDATE_TYPES.MOVE_EXISTING:
          this.insertChildAt(update.parentNode, initialChildren[update.parentId][update.fromIndex], update.toIndex);
          break;
        case UPDATE_TYPES.REMOVE_NODE:
          // 什么都不需要做，因为上面已经帮忙删除掉了
          break;
      }
    }
  }
  insertChildAt(parentNode, childNode, index) {
    var beforeChild = parentNode.children().get(index);
    beforeChild ? childNode.insertBefore(beforeChild) : childNode.appendTo(parentNode);
  }
  //普通的children是一个数组，此方法把它转换成一个map
  //key就是element的key,如果是text节点或者element创建时并没有传入key,就直接用在数组里的index标识
  flattenChildren(componentChildren) {
    let childMap = {};
    for (let i = 0; i < componentChildren.length; i++) {
      let child = componentChildren[i];
      childMap[child && child.element && child.element.key ? child.element.key : i.toString(36)] = child;
    }
    return childMap;
  }
  //主要用来生成子节点elements的component集合
  //这边有个判断逻辑，如果发现是更新，就会继续使用以前的componentInstance,调用对应的receiveComponent
  //如果是新的节点，就会重新生成一个新的componentInstance，
  generateComponentChildren(prevChildren, nextChildrenElements = []) {
    let nextChildren = {};
    //循环新元素数组
    $.each(nextChildrenElements, (index, nextElement) => {
      //获取新的名称
      var name = nextElement.key ? nextElement.key : index;
      //获取老的节点
      let prevChild = prevChildren && prevChildren[name];
      //获取老的节点对应的元素
      let prevElement = prevChild && prevChild.element;
      if (shouldUpdateReactComponent(prevElement, nextElement)) {
        //更新的话直接递归调用子节点的receiveComponent就好了
        prevChild.receiveComponent(nextElement);
        //然后继续使用老的component
        nextChildren[name] = prevChild;
      } else {
        //对于没有老的，那就重新新增一个，重新生成一个component
        var nextChildInstance = instantiateReactComponent(nextElement);
        //使用新的component
        nextChildren[name] = nextChildInstance;
      }
    });
    return nextChildren;
  }
}

export default React;

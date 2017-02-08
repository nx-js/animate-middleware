'use strict'

const secret = {
  entering: Symbol('during entering animation'),
  leaving: Symbol('during leaving animation'),
  position: Symbol('animated element position'),
  parent: Symbol('parent node of leaving node'),
  listening: Symbol('listening for animationend')
}
const watchedNodes = new Map()
let checkQueued = false

function onAnimationEnd (ev) {
  const elem = ev.target
  if (elem[secret.leaving]) {
    elem.remove()
  }
  if (elem[secret.entering]) {
    elem.style.animation = ''
    elem[secret.entering] = false
  }
}

function animate (elem) {
  if (elem.nodeType !== 1) return

  elem.$attribute('enter-animation', enterAttribute)
  elem.$attribute('leave-animation', leaveAttribute)
  elem.$attribute('move-animation', moveAttribute)

  queueCheck()
  elem.$cleanup(queueCheck)
}
animate.$name = 'animate'
animate.$require = ['attributes']
module.exports = animate

function enterAttribute (animation) {
  if (this[secret.entering] !== false) {
    this[secret.entering] = true
    if (typeof animation === 'object' && animation) {
      animation = animationObjectToString(animation)
    } else if (typeof animation === 'string') {
      animation = animation
    }
    this.style.animation = animation
    setAnimationDefaults(this)
    registerListener(this)
  }
}

function leaveAttribute (animation) {
  if (!this[secret.parent]) {
    this[secret.parent] = this.parentNode
    this.$cleanup(onLeave, animation)
  }
  getPosition(this)
  registerListener(this)
}

function getPosition (node) {
  let position = watchedNodes.get(node)
  if (!position) {
    position = {}
    watchedNodes.set(node, position)
    node.$cleanup(unwatch)
  }
  return position
}

function registerListener (elem) {
  const root = elem.$root
  if (!root[secret.listening]) {
    root.addEventListener('animationend', onAnimationEnd, true)
    root[secret.listening] = true
  }
}

function onLeave (animation) {
  this[secret.leaving] = true
  if (typeof animation === 'object' && animation) {
    animation = animationObjectToString(animation)
  } else if (typeof animation === 'string') {
    animation = animation
  }
  this.style.animation = animation
  setAnimationDefaults(this)

  this[secret.parent].appendChild(this)
  if (shouldAbsolutePosition(this)) {
    toAbsolutePosition(this)
  }
}

function moveAttribute (transition) {
  const position = getPosition(this)
  position.move = true

  if (typeof transition === 'object' && transition) {
    transition = 'transform ' + transitionObjectToString(transition)
  } else if (typeof transition === 'string') {
    transition = 'transform ' + transition
  } else {
    transition = 'transform'
  }
  this.style.transition = transition
  setTransitionDefaults(this)
}

function unwatch () {
  watchedNodes.delete(this)
}

function queueCheck () {
  if (!checkQueued) {
    checkQueued = true
    requestAnimationFrame(checkWatchedNodes)
    requestAnimationFrame(moveWatchedNodes)
  }
}

function checkWatchedNodes () {
  watchedNodes.forEach(checkWatchedNode)
  checkQueued = false
}

function checkWatchedNode (position, node) {
  const prevTop = position.top
  const prevLeft = position.left

  position.top = node.offsetTop
  position.left = node.offsetLeft
  position.height = node.offsetHeight
  position.width = node.offsetWidth + 1

  position.xDiff = (prevLeft - position.left) || 0
  position.yDiff = (prevTop - position.top) || 0
}

function moveWatchedNodes () {
  watchedNodes.forEach(moveWatchedNode)
}

function moveWatchedNode (position, node) {
  if (position.move) {
    const style = node.style
    const transition = style.transition
    style.transition = ''
    style.transform = `translate(${position.xDiff}px, ${position.yDiff}px)`
    requestAnimationFrame(() => {
      style.transition = transition
      style.transform = ''
    })
  }
}

function animationObjectToString (animation) {
  return [
    animation.name,
    timeToString(animation.duration),
    animation.timingFunction,
    timeToString(animation.delay),
    animation.iterationCount,
    animation.direction,
    animation.fillMode,
    boolToPlayState(animation.playState)
  ].join(' ')
}

function transitionObjectToString (transition) {
  return [
    timeToString(transition.duration),
    timeToString(transition.delay),
    transition.timingFunction
  ].join(' ')
}

function setAnimationDefaults (elem) {
  const style = elem.style
  const duration = style.animationDuration
  const fillMode = style.animationFillMode
  if (duration === 'initial' || duration === '' || duration === '0s') {
    style.animationDuration = '1s'
  }
  if (fillMode === 'initial' || fillMode === '' || fillMode === 'none') {
    style.animationFillMode = 'both'
  }
}

function setTransitionDefaults (elem) {
  const style = elem.style
  const duration = style.transitionDuration
  if (duration === 'initial' || duration === '' || duration === '0s') {
    style.transitionDuration = '1s'
  }
}

function shouldAbsolutePosition (elem) {
  elem = elem.parentNode
  while (elem && elem !== elem.$root) {
    if (elem[secret.leaving]) return false
    elem = elem.parentNode
  }
  return true
}

function toAbsolutePosition (elem) {
  const style = elem.style
  const position = watchedNodes.get(elem)
  style.top = style.top || `${position.top}px`
  style.left = style.left || `${position.left}px`
  style.width = `${position.width}px`
  style.height = `${position.height}px`
  style.margin = '0'
  style.boxSizing = 'border-box'
  style.position = 'absolute'
}

function timeToString (time) {
  return (typeof time === 'number') ? time + 'ms' : time
}

function boolToPlayState (bool) {
  return (bool === false || bool === 'paused') ? 'paused' : 'running'
}

'use strict'

const secret = {
  entering: Symbol('during entering animation'),
  leaving: Symbol('during leaving animation'),
  moveTransition: Symbol('watch move transition'),
  position: Symbol('animated element position'),
  parent: Symbol('parent node of leaving node'),
  listening: Symbol('listening for animationend')
}
const watchedNodes = new Set()
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
    watchedNodes.add(this)
    this.$cleanup(unwatch)
    this.$cleanup(onLeave, animation)
    this[secret.parent] = this.parentNode
    registerListener(this)
  }
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
  if (!this[secret.moveTransition]) {
    watchedNodes.add(this)
    this.$cleanup(unwatch)
    this[secret.moveTransition] = true
  }
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
  }
}

function checkWatchedNodes () {
  for (let elem of watchedNodes) {
    const top = elem.offsetTop
    const bottom = top - elem.offsetHeight
    const left = elem.offsetLeft
    const right = left - elem.offsetWidth
    const position = {top, bottom, left, right}
    const prevPosition = elem[secret.position] || {}
    elem[secret.position] = position

    const xDiff = (prevPosition.left - position.left) || 0
    const yDiff = (prevPosition.top - position.top) || 0
    if (elem[secret.moveTransition] && (xDiff || yDiff)) {
      onMove(elem, xDiff, yDiff)
    }
  }
  checkQueued = false
}

function onMove (elem, xDiff, yDiff) {
  const style = elem.style
  const transition = style.transition
  style.transition = ''
  style.transform = `translate(${xDiff}px, ${yDiff}px)`
  requestAnimationFrame(() => {
    style.transition = transition
    style.transform = ''
  })
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
  const position = elem[secret.position]
  style.top = style.top || `${position.top}px`
  style.bottom = style.bottom || `${position.bottom}px`
  style.left = style.left || `${position.left}px`
  style.right = style.right || `${position.right}px`
  style.margin = '0'
  style.position = 'absolute'
}

function timeToString (time) {
  return (typeof time === 'number') ? time + 'ms' : time
}

function boolToPlayState (bool) {
  return (bool === false || bool === 'paused') ? 'paused' : 'running'
}

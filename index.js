#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));
let state = {}
const fs = require('fs')

// grab the inputted file path
fs.readFile(argv.f, (err, data) => {
  state = data
})

const initialText = 'import Vue from \'vue\''
let typesString = ''
let gettersString = ''
let actionsString = ''
let mutatorsString = ''

generateCodeFromType = (type, hasChildren) => {

  // 1) add to the types string
  typesString += `\nexport const ${type} = '${type}'`

  // 3) add to the getters string
  const newGetter = type.split('_')
    .reduce((acc, currVal) => `${acc}.${currVal.toLowerCase()}`, 'state')
  gettersString += `\n${type}: (state) => ${newGetter},`

  // 4) add to the actions string
  actionsString += `\nset_${type}: ({ commit }, data) => commit(${type}, data),`

  // 5) add to the mutator string
  const lastKey = type.split('_').slice(-1).pop()
  const isBaseKey = !type.includes('_')
  let statePath = newGetter.split('.')
  statePath.pop()
  statePath = statePath.join('.')

  // if the key has children, need to do an object.assign
  if (hasChildren) {
    if (isBaseKey) mutatorsString += `\n[${type}]: (state, { type, data }) => { \nVue.set(state, '${lastKey.toLowerCase()}', Object.assign({}, state['${lastKey.toLowerCase()}'], data)) \n},`
    else mutatorsString += `\n[${type}]: (state, { type, data }) => { \nVue.set(state[type], '${lastKey.toLowerCase()}', Object.assign({}, ${statePath}, data)) \n},`
  } else { // otherwise do state[type], 'last key', data
    if (isBaseKey) mutatorsString += `\n[${type}]: (state, { type, data }) => { \nVue.set(state, '${lastKey.toLowerCase()}', data) \n},`
    else mutatorsString += `\n[${type}]: (state, { type, data }) => { \nVue.set(${statePath}, '${lastKey.toLowerCase()}', data) \n},`
  } 
}

recursiveIterator = (currentState, parentString = '') => {
  const keys = Object.keys(currentState)

  keys.forEach(key => {
    // check if it's an object and has children
    if (typeof currentState[key] === 'object') {
      // generate code for this part of state
      generateCodeFromType(`${parentString}${key.toUpperCase()}`, true)
      const newParentString = `${parentString}${key.toUpperCase()}_`
      const newCurrentState = currentState[key]

      return recursiveIterator(newCurrentState, newParentString)
    } else {
      generateCodeFromType(`${parentString}${key.toUpperCase()}`, false)
      return
    }
  })
}

recursiveIterator(state)
const output = `${initialText}\n\n${typesString}\n\nexport default {\nstate: ${JSON.stringify(state)},\ngetters: {${gettersString}\n},\nactions: {${actionsString}\n},\nmutations: {${mutatorsString}}\n}`
fs.writeFile('./store.js', output, (e) => {
  if (e) console.log(`Errors: ${e}`)
})
console.log('store generated into ./store.js')

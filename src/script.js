/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import path from 'path'

import {
  logWarn,
  parseRequireModule
} from './util'
import {
  parseScript
} from './parser'

const { DEVICE_LEVEL } = require('./lite/lite-enum')

module.exports = function (source, map) {
  this.cacheable && this.cacheable()
  const callback = this.async()
  parseScript(source, this.resourcePath)
    .then(({
      parsed, log
    }) => {
      if (log && log.length) {
        logWarn(this, log)
      }
      parsed = parseRequireModule(parsed)
      if (process.env.DEVICE_LEVEL === DEVICE_LEVEL.RICH || process.env.DEVICE_LEVEL === 'card') {
        const appName = process.env.abilityType === 'page' ? 'app.js' : `${process.env.abilityType}.js`
        if (path.basename(this.resourcePath) !== appName) {
          parsed += `\nvar moduleOwn = exports.default || module.exports;\n` +
            `var accessors = ['public', 'protected', 'private'];
if (moduleOwn.data && accessors.some(function (acc) {
    return moduleOwn[acc];
  })) {\n  throw new Error('For VM objects, attribute data must not coexist with public,` +
  ` protected, or private. Please replace data with public.');
} else if (!moduleOwn.data) {
  moduleOwn.data = {};\n  moduleOwn._descriptor = {};\n  accessors.forEach(function(acc) {
    var accType = typeof moduleOwn[acc];
    if (accType === 'object') {
      moduleOwn.data = Object.assign(moduleOwn.data, moduleOwn[acc]);
      for (var name in moduleOwn[acc]) {
        moduleOwn._descriptor[name] = {access : acc};
      }
    } else if (accType === 'function') {
      console.warn('For VM objects, attribute ' + acc +` +
      ` ' value must not be a function. Change the value to an object.');
    }\n  });\n}`
        }
        let result = `module.exports = function(module, exports, $app_require$){${parsed}}`
        result += '\n/* generated by ace-loader */\n'
        callback(null, result, map)
      }
      if (process.env.DEVICE_LEVEL === DEVICE_LEVEL.LITE) {
        callback(null, parsed, map)
      }
    }).catch(e => {
      logWarn(this, [{
        reason: 'ERROR: Failed to parse the JS file. ' + e
      }])
      callback('')
    })
}
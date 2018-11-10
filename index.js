var redis = require('redis')

function FunctionBus (opts) {
  opts = opts || {}
  var that = this

  this.serialize = opts.serialize || this.defaultSerialize
  this.deserialize = opts.deserialize || this.defaultDeserialize
  this.channelPrefix = opts.channelPrefix || 'exec:'

  this.callback_queues = {}
  this.onExec = function () {}

  var redisConfig = opts.redisConfig || {}
  this.sub = opts.sub || redis.createClient(redisConfig)
  this.pub = opts.pub || redis.createClient(redisConfig)

  this.sub.on('pmessage', function (pattern, channel, message) {
    var args = that.deserialize(message)
    var key = channel.slice(that.channelPrefix.length)
    that._execute(key, args)
  })

  this.sub.psubscribe(this.channelPrefix + '*')
}

FunctionBus.prototype.onExecute = function onExecute (func) {
  this.onExec = func
}

FunctionBus.prototype.defaultSerialize = function defaultSerialize (args) {
  return JSON.stringify(args.map(function (obj) {
    if (obj instanceof Error) {
      return { _type: 'error', message: obj.message }
    } else {
      return obj
    }
  }))
}

FunctionBus.prototype.defaultDeserialize = function defaultDeserialize (json) {
  return JSON.parse(json).map(function (obj) {
    if (obj._type === 'error') {
      return new Error(obj.message)
    } else {
      return obj
    }
  })
}

FunctionBus.prototype.queue = function queue (key, cb) {
  if (typeof key !== 'string') throw Error('Queue function: key must be a string')
  if (this.callback_queues[key]) {
    this.callback_queues[key].push(cb)
  } else {
    this.callback_queues[key] = [cb]
  }
}

FunctionBus.prototype._execute = function _execute (key, args) {
  var len = this.len(key)

  if (!len) return

  this.onExec(key, len)

  for (var i = 0; i < len; i++) {
    setImmediate((function (f) {
      return function () {
        f.apply(this, args)
      }
    })(this.callback_queues[key][i]))
  }
  delete this.callback_queues[key]
}

FunctionBus.prototype.execute = function execute (key, args) {
  if (typeof key !== 'string') throw Error('Execute function: key must be a string')
  this.pub.publish(this.channelPrefix + key, this.serialize(args))
}

FunctionBus.prototype.len = function len (key) {
  return key in this.callback_queues ? this.callback_queues[key].length : 0
}

module.exports = FunctionBus

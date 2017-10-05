require('setimmediate');
var redis = require('redis');

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function startsWith(searchString, position) {
    return this.substr(position || 0, searchString.length) === searchString;
  };
}

function FunctionBus(opts) {
  opts = opts || {};
  var that = this;

  this.serialize = opts.serialize || this.defaultSerialize;
  this.deserialize = opts.deserialize || this.defaultDeserialize;
  this.channelPrefix = opts.channelPrefix || 'event:';

  this.startPrefix = this.channelPrefix + 'start:';
  this.endPrefix = this.channelPrefix + 'end:';
  this.pausePrefix = this.channelPrefix + 'pause';
  this.resumePrefix = this.channelPrefix + 'resume';

  this.callback_queues = {};
  this.total_callbacks = {};

  this.argsOnHold = {};
  this.isPaused = false;

  var redisConfig = opts.redisConfig || {};
  this.redisClient = redis.createClient(redisConfig);

  this.sub = redis.createClient(redisConfig);
  this.pub = redis.createClient(redisConfig);

  this.sub.on('pmessage', function (pattern, channel, message) {
    var args, key;
    if (channel.startsWith(that.startPrefix)) {
      key = channel.slice(that.startPrefix.length);
      if (!(key in that.total_callbacks)) {
        that.total_callbacks[key] = 0;
      }
      that.total_callbacks[key]++;
    } else if (channel.startsWith(that.endPrefix)) {
      args = that.deserialize(message);
      key = channel.slice(that.endPrefix.length);
      that._execute(key, args);
    } else if (channel === that.pausePrefix) {
      that._pause();
    } else if (channel === that.resumePrefix) {
      that._resume();
    }
  });

  this.sub.psubscribe(this.channelPrefix + '*');
}

FunctionBus.prototype.defaultSerialize = function defaultSerialize(args) {
  return JSON.stringify(args.map(function (obj) {
    if (obj instanceof Error) {
      return { _type: 'error', message: obj.message };
    } else {
      return obj;
    }
  }));
};

FunctionBus.prototype.defaultDeserialize = function defaultDeserialize(json) {
  return JSON.parse(json).map(function (obj) {
    if (obj._type === 'error') {
      return new Error(obj.message);
    } else {
      return obj;
    }
  });
};

FunctionBus.prototype.queue = function queue(key, cb) {
  if (this.callback_queues[key]) {
    this.callback_queues[key].push(cb);
  } else {
    this.callback_queues[key] = [cb];
  }
  this.pub.publish(this.startPrefix + key, '');
};

FunctionBus.prototype._execute = function _execute(key, args) {
  if (this.isPaused) {
    this.argsOnHold[key] = args;
    return;
  }
  var len = this._length(key);
  for (var i = 0; i < len; i++) {
    setImmediate((function (f) {
      return function () {
        f.apply(this, args);
      };
    })(this.callback_queues[key][i]));
  }
  delete this.total_callbacks[key];
  delete this.callback_queues[key];
};

FunctionBus.prototype.execute = function execute(key, args) {
  this.pub.publish(this.endPrefix + key, this.serialize(args));
};


FunctionBus.prototype._pause = function _pause(key) {
  this.isPaused = true;
};

FunctionBus.prototype._resume = function _resume(key) {
  this.isPaused = false;
  for (var key in this.argsOnHold) {
    this.execute(key, this.argsOnHold[key]);
  }
};

FunctionBus.prototype.pause = function pause(key) {
  this.pub.publish(this.pausePrefix, '');
};

FunctionBus.prototype.resume = function resume(key) {
  this.pub.publish(this.resumePrefix, '');
};

FunctionBus.prototype.has = function has(key) {
  return key in this.callback_queues || key in this.total_callbacks;
};

FunctionBus.prototype._length = function _length(key) {
  return this.callback_queues[key] ? this.callback_queues[key].length : 0;
};

module.exports = FunctionBus;

function-bus-redis
==================
An object storing functions by key. These can be then executed grouped by key.

Useful to coordinate execution across different processes.

Uses Redis pub/sub.

```js
var FunctionBus = require('function-bus-redis');
var functionBus = new FunctionBus();

// queue functions by key
functionBus.queue('a', func1);
functionBus.queue('a', func2);
functionBus.queue('b', func3);

// number of functions queued by key
functionBus.len('a'); // 2
functionBus.len('b'); // 1
functionBus.len('c'); // 0

// execute the 2 functions with key "a"
// passing 3 arguments: 1, 2, 3
functionBus.execute('a', [1, 2, 3]);
```
It works also across different processes connected to the same redis.

Options:
* serialize [optional]: function used to serialize the values when they are sent to redis
* deserialize [optional]: function used to deserialize the values when they are received from redis
* channelPrefix [optional]: the prefix used for redis pub/sub
* redisConfig [optional]: node-redis configuration
* pub/sub [optional]: redisClients (2 different!). If they are not passed they are created using redisConfig.

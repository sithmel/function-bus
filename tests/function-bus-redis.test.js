var assert = require('chai').assert;
var FunctionBus = require('../');

describe('function bus', function () {
  it('is a factory function', function () {
    assert.typeOf(FunctionBus, 'function');
    assert.typeOf(new FunctionBus(), 'object');
  });

  it('pub sub', function (done) {
    var bus = new FunctionBus();
    var result = '';
    bus.queue('a', function (obj) {
      result += obj;
    });
    bus.queue('a', function (obj) {
      result += obj;
    });
    bus.queue('b', function (obj) {
      result += obj;
    });
    assert.equal(bus._length('a'), 2);
    assert.equal(bus._length('b'), 1);
    bus.execute('a', ['test']);
    setTimeout(function () {
      assert.equal(result, 'testtest');
      assert.equal(bus._length('a'), 0);
      assert.equal(bus._length('b'), 1);
      done();
    }, 10);
  });

  it('pub sub (pause)', function (done) {
    var bus = new FunctionBus();
    var result = '';
    bus.queue('a', function (obj) {
      result += obj;
    });
    bus.queue('a', function (obj) {
      result += obj;
    });
    bus.queue('b', function (obj) {
      result += obj;
    });
    assert.equal(bus._length('a'), 2);
    assert.equal(bus._length('b'), 1);
    bus.pause();
    bus.execute('a', ['test']);
    bus.resume();
    setTimeout(function () {
      assert.equal(result, 'testtest');
      assert.equal(bus._length('a'), 0);
      assert.equal(bus._length('b'), 1);
      done();
    }, 10);
  });

  it('serialize/deserialize', function () {
    var bus = new FunctionBus();
    var json = bus.serialize([1, new Error('oh my')]);
    var args = bus.deserialize(json);
    assert.equal(args[0], 1);
    assert.instanceOf(args[1], Error);
    assert.equal(args[1].message, 'oh my');
  });

  it.only('works across more instances', function (done) {
    var bus1 = new FunctionBus();
    var bus2 = new FunctionBus();
    var result = '';
    bus1.queue('a', function (obj) {
      result += obj;
    });
    bus2.queue('a', function (obj) {
      result += obj;
    });
    bus1.queue('b', function (obj) {
      result += obj;
    });
    assert.equal(bus1._length('a'), 1);
    assert.equal(bus1._length('b'), 1);
    setTimeout(function () {
      bus1.execute('a', ['test']);
      setTimeout(function () {
        assert.equal(result, 'testtest');
        assert.equal(bus1._length('a'), 0);
        assert.equal(bus1._length('b'), 1);
        done();
      }, 10);
    }, 10);
  });

});

var slice = Array.prototype.slice;
module.exports = co['default'] = co.co = co;
co.wrap = function (fn) {
  //兼容有参数的generator函数
  //利用柯里化将generator转换成普通函数
  createPromise.__generatorFunction__ = fn;
  return createPromise;
  function createPromise() {
    return co.call(this, fn.apply(this, arguments));
  }
};
function co(gen) {
  var ctx = this;
  //获得当前上下文环境
  var args = slice.call(arguments, 1);
  //获得多参数(如果有的话)
  // we wrap everything in a promise to avoid promise chaining,
  // which leads to memory leak errors.
  // see https://github.com/tj/co/issues/180
  //会内存泄漏
  //返回一个promise相当于将一切都包裹在promise里面。使得我们co返回的可以使用promise的方法
  // co的返回值是Promise对象。为什么可以then和catch的根源
  return new Promise(function(resolve, reject) {
    //做类型的判断。
    if (typeof gen === 'function') gen = gen.apply(ctx, args);
    //Generator函数执行之后会是typeof会是对象。
    //默认执行调用一次Generator返回一个遍历器对象Generator
    if (!gen || typeof gen.next !== 'function') return resolve(gen);
    //判断类型 如果不符合  promise就进入resolved
    // 看看是不是Generator指针
    //传入的不是Generators函数，没有next，
    // 就直接resolve返回结果;这里是错误兼容而已，因为co就是基于generator function的，传入其他的没有意义

    //执行onFulfilled
    onFulfilled();
    //返回一个promise

    //onFulfilled干了什么。其实跟我们之前的一样，只是这里涉及到了promise的状态。如果出错了。状态返回是reject
    function onFulfilled(res) {
      var ret;
      try {
        ret = gen.next(res);
        //初始化启动一遍Generator next
      } catch (e) {
        return reject(e);
        //一有错误的话就抛出错误转向rejected
      }
      // 初始化即将第一次yield的·值·传给next
      next(ret);
      //将这个指针对象转交next函数处理
      // 实现自动化的关键
      return null;
    }
    function onRejected(err) {
      //接受error错误
      var ret;
      //这块其实就是处理整个流程的错误控制
      try {
        ret = gen.throw(err);
        //利用Generator throw错误给try catch捕获
      } catch (e) {
        return reject(e);
        //使得Promise进入rejected
      }
      next(ret);
    }
    function next(ret) {
      //接受指针对象

      if (ret.done) return resolve(ret.value);
      //显示对ret指针状态做判断，done为true证明generator已经结束
      //此时进入resolved结束整个Generator
      var value = toPromise.call(ctx, ret.value);
      //将yield 的值进行Promise转换

      if (value && isPromise(value)) return value.then(onFulfilled, onRejected);
      //value在我们允许的范围内，那么value.then注入onFulfilled与onRejected，来执行下一次gen.next。
      //在onFulfilled又将调用next从而使得next不停的利用then做调用
      //如果值是存在并且可以进行promise的转换。(也就是不是基本类型/或假值)
      return onRejected(new TypeError('You may only yield a function, promise, generator, array, or object, '
        + 'but the following object was passed: "' + String(ret.value) + '"'));
      //如果没有经过值转换或者value为空的时候。此时将抛出错误。
      //因为那就是所谓的基本类型不支持了
      //function, promise, generator, array, or object只支持这几种的
    }
  });
}
//注意我们就只允许这几种类型转换。
//那么进入判断的时候我们就可以很简单地判断了，然后决定promise的状态
function toPromise(obj) {
  if (!obj) return obj;
  //如果obj undefined 或者别的假值返回这个undefined
  if (isPromise(obj)) return obj;
  //如果是个Promise的话就返回这个值
  if (isGeneratorFunction(obj) || isGenerator(obj)) return co.call(this, obj);
  //判断是不是Generator function是的话用co处理
  if ('function' == typeof obj) return thunkToPromise.call(this, obj);
  //如果是函数的话，使用thunk to promise转换
  if (Array.isArray(obj)) return arrayToPromise.call(this, obj);
  //如果是数组 使用array to promise
  if (isObject(obj)) return objectToPromise.call(this, obj);
  //如果是对象 使用object to promise 转换
  return obj;
  //如果都不是 就返回`值`
}
// co关于yield后边的值也是有一定的要求的，只能是一个 Function｜Promise｜Generator|Generator Function ｜ Array | Object；
// 而 yield Array和Object中的item也必须是  Function｜Promise｜Generator ｜ Array | Object；
// 如果不符合的话就将Promise rejected掉并发出警告

//下面是一些工具函数

//使用thunk后的fnction 我们只允许它有一个参数callbak
//允许有多个参数 第一个参数为error
//在node环境下 第一个为error对象
function thunkToPromise(fn) {
  var ctx = this;
  return new Promise(function (resolve, reject) {
    fn.call(ctx, function (err, res) {
      if (err) return reject(err);
      if (arguments.length > 2) res = slice.call(arguments, 1);
      resolve(res);
    });
  });
}
// thunkToPromise传入一个thunk函数
// 函数返回一个Promise对象
// promise里面执行这个函数
// nodejs的回调函数 第一个参数都是err
// 如果有错误就进入rejected(前面我们可以看到 value.then(onFulfilled, onRejected); )
// 如果有error就rejected了
// 如果没有的话就调用resolve( 后面onFulfilled )


//将数组中的所有值均promise化后执行，Promise.all会等待数组内所有promise均fulfilled、或者有一个rejected，才会执行其后的then。
//对一些基本类型 例如数字 字符串之类的，是不会被toPromise转换的
//最后在resolve(res)的时候 res就是存有所有异步操作执行完的值数组
function arrayToPromise(obj) {
  return Promise.all(obj.map(toPromise, this));
}
//对象通过key进行遍历，
//对于每个被promise化好的value
//都将其存储于promises中，最后Promise.all，
//生成results。
//objectToPromise实现实在是太可怕了=-=
//所以很多字企图把它讲顺了
function objectToPromise(obj){
  var results = new obj.constructor();
  var keys = Object.keys(obj);
  var promises = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var promise = toPromise.call(this, obj[key]);
    // 确保obj[key]为promise对象
    // 然后调用defer推入 promises等待value的promise resolved之后将key放入results
    // 否则直接将 results[key] = obj[key](也就是无须promise化的)
    if (promise && isPromise(promise)) defer(promise, key);
    else results[key] = obj[key];
  }
// 利用promise.all来使用异步并行调用我们的promises
// 如果执行后进入resolved然后压入results对象
// 最后当然是返回这个results对象
// 然后后面的then在获得时候 onFulfilled onRejected的参数将是这个results
// 这样子我们每个promise的结果都会存在result对象对应的key内
// 返回的是一个promise 后面也就可以接着.then(onFulfilled)
  return Promise.all(promises).then(function () {
    return results;
  });

  function defer(promise, key) {
    // predefine the key in the result
    results[key] = undefined;
    promises.push(promise.then(function (res) {
      results[key] = res;
    }));
  }
}

//检查是不是promise
//·鸭子类型·判断。
function isPromise(obj) {
  return 'function' == typeof obj.then;
}
//判断是不是Generator迭代器
function isGenerator(obj) {
  return 'function' == typeof obj.next && 'function' == typeof obj.throw;
}
 //判断是不是generator函数
function isGeneratorFunction(obj) {
  var constructor = obj.constructor;
  if (!constructor) return false;
  if ('GeneratorFunction' === constructor.name || 'GeneratorFunction' === constructor.displayName) return true;
  return isGenerator(constructor.prototype);
}
//判断是不是对象
//plain object是指用JSON形式定义的普通对象或者new Object()创建的简单对象
function isObject(val) {
  return Object == val.constructor;
}
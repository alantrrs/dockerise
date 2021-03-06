/* eslint-env mocha */

var assert = require('assert')
var debug = require('debug')('dockerise')

var docker = require('..')
describe('Docker', function () {
  const standaloneContainer = {Image: 'standalone-test'}
  const testServer = {Image: 'alantrrs/test_solver'}
  const testClient = {Image: 'alantrrs/test_evaluator'}
  it('runs with a volume attached')
  it('builds an image', function (done) {
    this.timeout(300000)
    docker.build('./test/test_project', {
      build: '.',
      tag: 'standalone-test'
    }).then(function (stream) {
      assert(stream)
      stream.on('end', function (data) {
        done()
      }).on('data', function (data) {
        assert(!data.error)
        debug(data.toString())
      }).on('error', done)
    }).catch(done)
  })
  it('respects .dockerignore', function (done) {
    this.timeout(300000)
    docker.build('./test/project2', {
      build: '.',
      tag: 'ignore-test'
    }).then(function (stream) {
      assert(stream)
      stream.on('end', function (data) {
        done()
      }).on('data', function (data) {
        assert(!JSON.parse(data).error, 'Should build without error')
        debug(data.toString())
      }).on('error', done)
    }).catch(done)
  })
  it('runs a container', function (done) {
    this.timeout(10000)
    docker.run(standaloneContainer).then(function () {
      done()
    }).catch(done)
  })
  it('overrides entrypoint', function (done) {
    this.timeout(10000)
    var container = standaloneContainer
    container.Entrypoint = 'ls -la'
    docker.run(container).then(function () {
      done()
    }).catch(done)
  })
  it('overrides entrypoint and command', function (done) {
    this.timeout(10000)
    var container = standaloneContainer
    container.Entrypoint = 'ls'
    container.Command = '-la'
    docker.run(container).then(function () {
      done()
    }).catch(done)
  })
  it('runs a container with a log handler', function (done) {
    this.timeout(10000)
    var usedLogHandler = 0
    function logHandler (log) {
      debug(log)
      usedLogHandler += 1
    }
    docker.run(standaloneContainer, logHandler).then(function () {
      assert(usedLogHandler, 'logHandler should\'ve been used')
      done()
    }).catch(done)
  })
  it('should run server-client containers linked', function (done) {
    this.timeout(10000)
    docker.runLinked(testServer, testClient).then(function (containers) {
      done()
      // TODO: Assert containers ran correctly
    }).catch(done)
  })
  it('should pull', function (done) {
    this.timeout(20000)
    docker.pull('alantrrs/true')
    .then(function (data) {
      done()
    }).catch(function (err) {
      done(err)
    })
  })
  it('should push an image', function (done) {
    this.timeout(10000)
    assert(process.env.DOCKER_USER, 'DOCKER_USER is not set')
    assert(process.env.DOCKER_PASSWORD, 'DOCKER_PASSWORD is not set')
    docker.push('alantrrs/true', {
      username: process.env.DOCKER_USER,
      password: process.env.DOCKER_PASSWORD
    })
    .then(function (data) {
      done()
    }).catch(function (err) {
      done(err)
    })
  })
})


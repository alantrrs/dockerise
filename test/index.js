/* eslint-env mocha */

var assert = require('assert')

var docker = require('..')
describe('Docker', function () {
  it('runs with a volume attached')
  it('should run server-client containers linked', function (done) {
    this.timeout(10000)
    const test_server = {
      image: 'alantrrs/test_solver'
    }
    const test_client = {
      image: 'alantrrs/test_evaluator'
    }
    docker.runLinked(test_server, test_client).then(function (containers) {
      done()
      // TODO: Assert containers ran correctly
    }).catch(done)
  })
  it('builds an image')
  it('respects .dockerignore')
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


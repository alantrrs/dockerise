
var Docker = require('dockerode')
var tar = require('tar-fs')
var path = require('path')
var shortid = require('shortid')
var debug = require('debug')('dockerise')
var stream = require('stream')
var docker = new Docker()

// TODO: Exclude .dockerignore and .gitignore patterns from context
function build (codeDir, params) {
  // FIXME: make sure build path is not outside the code_dir
  var context = path.resolve(codeDir, params.build)
  var query = {t: params.tag, dockerfile: params.dockerfile}
  return new Promise(function (resolve, reject) {
    docker.buildImage(tar.pack(context), query, function (err, stream) {
      if (err) return reject(err)
      resolve(stream)
    })
  })
}

function logStreamHandler (logHandler) {
  var ws = stream.Writable()
  ws._write = function (chunk, enc, next) {
    logHandler(chunk.toString())
    next()
  }
  return ws
}

/* dockerode.run params
 * - image
 * - cmd
 * - streams
 * - create_options (optional)
 * - start_options (optional)
 * - callback
 */

function run (params, logHandler) {
  return new Promise(function (resolve, reject) {
    if (params.command && !Array.isArray(params.command)) {
      params.command = params.command.split(' ')
    }
    if (params.entrypoint && !Array.isArray(params.entrypoint)) {
      params.entrypoint = params.entrypoint.split(' ')
    }
    var logStream
    if (logHandler) logStream = logStreamHandler(logHandler)
    debug(`${params.image}: Running container`)
    docker.run(
      params.image,
      params.command,
      logStream || process.stdout, {
        name: params.name,
        Entrypoint: params.entrypoint,
        Env: params.env,
        HostConfig: {
          Links: params.links,
          Binds: params.binds
        }
      }, function (err, data, container) {
        debug(`${params.image}: Finished running`)
        debug('DATA: %o', data)
        debug('CONTAINER: %o', container)
        if (err) return reject({err: err, msg: 'ERROR: docker run'})
        if (!container) return reject({err: 'UserError', msg: 'Image does not exist'})
        resolve({container: container, data: data})
      }
    )
  })
}

function runLinked (server, client) {
  // TODO: server.name probably should be random
  const serverName = server.name || shortid.generate()
  return new Promise(function (resolve, reject) {
    if (server.command && !Array.isArray(server.command)) {
      server.command = server.command.split(' ')
    }
    debug(`${server.image}: Running container`)

    docker.run(
      server.image,
      server.command,
      [process.stdout, process.stderr], {
        name: serverName,
        Tty: false,
        Entrypoint: server.entrypoint
      }, function (err, data, container) {
        debug(`${server.image}: Finished running`)
        debug('DATA: %o', data)
        debug('CONTAINER: %o', container)
        if (err) return reject({err: err, msg: 'ERROR: docker run'})
        if (data.StatusCode) return reject({err: 'UserError', msg: `server failed with status ${data.StatusCode}`})
        container.remove(function (err, data) {
          if (err) return reject({err: err, msg: 'ERROR: docker remove'})
        })
      }
    ).on('start', function (container) {
      debug(`${server.image}: Container started`)
      client.links = [`${serverName}:solver`]
      return run(client).then(function (res) {
        resolve({server: container, client: res.container})
      }).catch(function (err) {
        debug('ERROR RUNNING client:' + err)
        // Inspect the container first to figure out its state
        return inspect(container).then(function () {
          // Stop and remove.
          stop(container).then(remove, function (err) {
            // Remove anyway if stop fails (probably cause already stopped)
            debug('CONTAINER STOP ERROR:' + err)
            return remove(container)
          }).then(function () {
            reject(err)
          }).catch(reject)
        })
      })
    })
  })
}

function inspect (container) {
  return new Promise(function (resolve, reject) {
    container.inspect(function (err, data) {
      debug('Inspect: %o', data.State)
      if (err) return reject(err)
      resolve(container)
    })
  })
}

function stop (container) {
  return new Promise(function (resolve, reject) {
    container.stop(function (err, data) {
      debug('stopping container' + container.id)
      debug('stop data: %o', data)
      if (err) return reject(err)
      resolve(container)
    })
  })
}

function remove (container) {
  return new Promise(function (resolve, reject) {
    container.remove(function (err, data) {
      debug('removing container' + container.id)
      debug('remove data: %o', data)
      debug('remove err: %o', err)
      // CircleCI doesn't allow removing containers. This avoids error
      // See https://github.com/portertech/kitchen-docker/issues/98#issuecomment-80786250
      // https://discuss.circleci.com/t/docker-error-removing-intermediate-container/70
      if (process.env.CIRCLECI) return resolve(data)
      if (err) return reject(err)
      resolve(data)
    })
  })
}

function pull (imageName, auth, onProgress) {
  return new Promise(function (resolve, reject) {
    docker.pull(imageName, {
      authconfig: auth
    }, function (err, stream) {
      if (err) return reject(err)
      docker.modem.followProgress(stream, function (err, data) {
        if (err) return reject(err)
        resolve(data)
      }, onProgress)
    })
  })
}

function push (imageName, auth, onProgress) {
  return new Promise(function (resolve, reject) {
    var image = docker.getImage(imageName)
    image.push({
      authconfig: auth
    }, function (err, stream) {
      if (err) return reject(err)
      docker.modem.followProgress(stream, function (err, data) {
        if (err) return reject(err)
        resolve(data)
      }, onProgress)
    })
  })
}

module.exports = {
  build: build,
  run: run,
  runLinked: runLinked,
  inspect: inspect,
  stop: stop,
  remove: remove,
  push: push,
  pull: pull
}

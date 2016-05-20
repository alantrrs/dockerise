
var Docker = require('dockerode')
var tar = require('tar-fs')
var path = require('path')
var shortid = require('shortid')

var docker = new Docker({socketPath: '/var/run/docker.sock'})

// TODO: Exclude .dockerignore and .gitignore patterns from context
function build (codeDir, params) {
  // FIXME: make sure build path is not outside the code_dir
  var context = path.resolve(codeDir, params.build)
  var query = {t: params.tag, dockerfile: params.dockerfile}
  return new Promise(function (resolve, reject) {
    docker.buildImage(tar.pack(context), query, function (err, stream) {
      if (err) return reject(err)
      if (!stream) return reject({msg: 'DOCKER BUILD ERROR: null stream'})
      // TODO: pass callbacks for stdout and stderr
      stream.pipe(process.stdout, {end: true})
      stream.on('end', function () {
        params.image = params.tag
        resolve(params)
      })
    })
  })
}

/* dockerode.run params
 * - image
 * - cmd
 * - streams
 * - create_options (optional)
 * - start_options (optional)
 * - callback
 */
function run (params) {
  return new Promise(function (resolve, reject) {
    if (params.command && !Array.isArray(params.command)) {
      params.command = params.command.split(' ')
    }
    console.log(`${params.image}: Running container`)
    docker.run(
      params.image,
      params.command,
      [process.stdout, process.stderr], {
        name: params.name,
        Tty: false,
        Entrypoint: params.entrypoint,
        Env: params.env,
        HostConfig: {
          Links: params.links,
          Binds: params.binds
        }
      }, function (err, data, container) {
        console.log(`${params.image}: Finished running`)
        console.log('DATA:', data)
        console.log('CONTAINER:', container)
        if (err) return reject({err: err, msg: 'ERROR: docker run'})
        if (!container) return reject({err: 'UserError', msg: 'Image does not exist'})
        if (data.StatusCode) {
          return remove(container).then(function () {
            reject({err: 'UserError', msg: `Evalutor failed with status ${data.StatusCode}`})
          })
        }
        resolve({container: container, data: data})
      }
    )
  })
}

function runLinked (server, client) {
  // TODO: server.name probably should be random
  const server_name = server.name || shortid.generate()
  return new Promise(function (resolve, reject) {
    if (server.command && !Array.isArray(server.command)) {
      server.command = server.command.split(' ')
    }
    console.log(`${server.image}: Running container`)

    docker.run(
      server.image,
      server.command,
      [process.stdout, process.stderr], {
        name: server_name,
        Tty: false,
        Entrypoint: server.entrypoint
      }, function (err, data, container) {
        console.log(`${server.image}: Finished running`)
        console.log('DATA:', data)
        console.log('CONTAINER:', container)
        if (err) return reject({err: err, msg: 'ERROR: docker run'})
        if (data.StatusCode) return reject({err: 'UserError', msg: `server failed with status ${data.StatusCode}`})
        container.remove(function (err, data) {
          if (err) return reject({err: err, msg: 'ERROR: docker remove'})
        })
      }
    ).on('start', function (container) {
      console.log(`${server.image}: Container started`)
      client.links = [`${server_name}:solver`]
      return run(client).then(function (res) {
        resolve({server: container, client: res.container})
      }).catch(function (err) {
        // TODO: If 404 pull the image first and retry
        console.log('ERROR RUNNING client:', err)
        // Inspect the container first to figure out its state
        return inspect(container).then(function () {
          // Stop and remove.
          stop(container).then(remove, function (err) {
            // Remove anyway if stop fails (probably cause already stopped)
            console.log('CONTAINER STOP ERROR:', err)
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
      console.log('Inspect:', data.State)
      if (err) return reject(err)
      resolve(container)
    })
  })
}

function stop (container) {
  return new Promise(function (resolve, reject) {
    container.stop(function (err, data) {
      console.log('stopping container', container.id)
      console.log('stop data:', data)
      if (err) return reject(err)
      resolve(container)
    })
  })
}

function remove (container) {
  return new Promise(function (resolve, reject) {
    container.remove(function (err, data) {
      console.log('removing container', container.id)
      console.log('remove data:', data)
      console.log('remove err:', err)
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

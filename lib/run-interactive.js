var Docker = require('dockerode')
var docker = new Docker()

var previousKey
var CTRL_P = '\u0010'
var CTRL_Q = '\u0011'

function handleError (err) {
  console.log(err)
  process.exit(1)
}

function handler (err, container) {
  var attachOpts = {stream: true, stdin: true, stdout: true, stderr: true}
  if (err) handleError(err)
  container.attach(attachOpts, function handler (err, stream) {
    if (err) handleError(err)
    // Show outputs
    stream.pipe(process.stdout)

    // Connect stdin
    var isRaw = process.isRaw
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdin.setRawMode(true)
    process.stdin.pipe(stream)

    process.stdin.on('data', function (key) {
      // Detects it is detaching a running container
      if (previousKey === CTRL_P && key === CTRL_Q) exit(stream, isRaw)
      previousKey = key
    })

    container.start(function (err, data) {
      if (err) handleError(err)
      resize(container)
      process.stdout.on('resize', function () {
        resize(container)
      })

      container.wait(function (err, data) {
        if (err) handleError(err)
        exit(stream, isRaw)
      })
    })
  })
}

// Resize tty
function resize (container) {
  var dimensions = {
    h: process.stdout.rows,
    w: process.stderr.columns
  }

  if (dimensions.h !== 0 && dimensions.w !== 0) {
    container.resize(dimensions, function () {})
  }
}

// Exit container
function exit (stream, isRaw) {
  process.stdout.removeListener('resize', resize)
  process.stdin.removeAllListeners()
  process.stdin.setRawMode(isRaw)
  process.stdin.resume()
  stream.end()
  process.exit()
}

function runInteractive (params) {
  if (params.command && !Array.isArray(params.command)) {
    params.command = params.command.split(' ')
  }
  if (params.entrypoint && !Array.isArray(params.entrypoint)) {
    params.entrypoint = params.entrypoint.split(' ')
  }
  var optsc = {
    Hostname: '',
    User: '',
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
    OpenStdin: true,
    StdinOnce: false,
    Env: params.env || null,
    Entrypoint: params.entrypoint,
    Cmd: params.cmd,
    Image: params.image,
    HostConfig: {
      Links: params.links,
      Binds: params.binds
    },
    Volumes: {},
    VolumesFrom: []
  }
  docker.createContainer(optsc, handler)
}

module.exports = runInteractive

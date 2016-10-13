
var docker = require('..')

docker.runInteractive({
  image: 'alantrrs/standalone-test',
  entrypoint: 'sh'
})

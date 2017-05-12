## v3.1.0 (11 May 2017)
- Will ignore files on .dockerignore

## v3.0.0 (25 Oct 2016)
- **Breaking changes**: 
This new release passes all parameters directly 
as create options when using ``run()`` and ``runLinked()``.
Parameters now should be formatted the same way as in dockerode.

## v2.1.4 (28 Sep 2016)
- Don't hardcode docker socket path. Use dockerode defaults
- Use dockerode 2.3.1

## v2.1.3 (27 Sep 2016)
- Allows to pass entrypoint as a string
- Adds tests for entrypoint and command

## v2.1.2 (23 Jun 2016)
- Fix premature approval of build test
- Remove unnecessary logs

## v2.1.1 (23 Jun 2016)
- Fix bug that was buffering all the logs until the run completed. 
Now they're streamed during the execution.

## v2.1.0 (22 Jun 2016)
- ``.run`` accepts a log handler function

## v2.0.0 (1 Jun 2016)
- ``.build(..)`` resolves to a stream now
- Doesn't throw noisy logs. Uses ``debug()`` instead of ``console.log()``

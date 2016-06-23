## v2.1.2 (23 Jun 2016)
- Remove noisy logs

## v2.1.1 (23 Jun 2016)
- Fix bug that was buffering all the logs until the run completed. 
Now they're streamed during the execution.

## v2.1.0 (22 Jun 2016)
- ``.run`` accepts a log handler function

## v2.0.0 (1 Jun 2016)
- ``.build(..)`` resolves to a stream now
- Doesn't throw noisy logs. Uses ``debug()`` instead of ``console.log()``

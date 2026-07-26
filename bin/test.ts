/*
|--------------------------------------------------------------------------
| Test runner entrypoint
|--------------------------------------------------------------------------
|
| The "test.ts" file is the entrypoint for running tests using Japa.
|
| Either you can run this file directly or use the "test"
| command to run this file and monitor file changes.
|
*/

process.env.NODE_ENV = 'test'

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'
import { configure, processCLIArgs, run } from '@japa/runner'

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .testRunner()
  .configure(async (app) => {
    const { runnerHooks, ...config } = await import('../tests/bootstrap.js')

    processCLIArgs(process.argv.splice(2))
    configure({
      ...app.rcFile.tests,
      ...config,
      ...{
        setup: runnerHooks.setup,
        teardown: runnerHooks.teardown.concat([() => app.terminate()]),
      },
    })
  })
  .run(() => run())
  /**
   * For debugging hanging terminal after running tests.
   */
  // .run(async () => {
  //   await run()

  //   setTimeout(() => {
  //     // @ts-ignore
  //     const handles = process._getActiveHandles()
  //     const sockets = handles.filter((h: any) => h?.constructor?.name === 'Socket')
  //     const timers = handles.filter(
  //       (h: any) => h?.constructor?.name === 'Timeout' || h?.constructor?.name === 'Interval'
  //     )

  //     if (sockets.length === 0 && timers.length === 0) return

  //     console.log(
  //       `\n[TEST LEAK] ${sockets.length} Socket(s), ${timers.length} Timer(s) still open:\n`
  //     )

  //     sockets.forEach((s: any, i: number) => {
  //       const remotePort = s.remotePort || s._peername?.port || 'N/A'
  //       const host = s.remoteAddress || s._peername?.address || 'localhost'
  //       console.log(`  🔌 Socket #${i + 1} -> ${host}:${remotePort} (Local Port: ${s.localPort})`)
  //     })

  //     timers.forEach((t: any, i: number) => {
  //       console.log(`Timer #${i + 1}  -> Delay: ${t._idleTimeout}ms`)
  //       console.log('')
  //     })
  //   }, 1000)
  // })
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })

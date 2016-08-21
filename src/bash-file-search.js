import {Observable} from 'rxjs'
import {spawn} from 'child_process'
import _ from 'lodash'
import {unixStylePath} from './test-file-builder'

/**
 * @typedef Observable
 * @type {object}
 * @desc An RxJS observable.
 */

/**
 * @typedef SearchResult
 * @type {object}
 * @desc A result from the Bash search.
 * @property {string} pattern The original glob pattern that was used.
 * @property {Array<string>} matches The list of file names that matched the
 *    glob pattern, relative to the base directory that was passed. The
 *    matches are sorted in lower-case alphabetical order.
 */

/**
 * An const object that represents a result where no files were found.
 * @type {SearchResult}
 */
export const emptyBashFileSearchResult = {
  pattern: '**/*',
  matches: [
  ]
}

/**
 * Search for glob patterns by spawning out to the Bash shell.
 * @param {string} pattern A glob pattern to search for.
 * @param {string} basedir The base directory to start the search from.
 * @return {Observable<SearchResult>} An observable containing the SearchResult result object.
 */
export function bashFileSearch (pattern, basedir) {
  let bashCommandLine = [
    '-O', 'globstar',
    '-O', 'extglob',
    '-O', 'nullglob',
    '-c',
    `for i in ${pattern}; do echo $i; done`
  ]

  return Observable.create((observer) => {
    let cp = spawn('bash', bashCommandLine, { cwd: basedir })
    let outputBuffer = new Buffer(0)
    cp.stdout.on('data', (data) => {
      outputBuffer = Buffer.concat([ outputBuffer, data ])
    })
    cp.stderr.on('data', (data) => console.error('bash: ' + data))
    cp.on('close', (code) => {
      if (code) {
        observer.error('bash test should finish nicely')
      } else {
        let matches = _(outputBuffer.toString().split(/\r*\n/))
          .filter((t) => t !== '')
          .map((t) => unixStylePath(t.replace(/\/$/, '')))
          .sortBy((t) => t.toLowerCase())
          .uniq()
          .value()
        observer.next({ pattern, matches })
        observer.complete()
      }
    })
  })
}

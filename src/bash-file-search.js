import {Observable} from 'rxjs'
import {spawn} from 'child_process'
import {platform} from 'os'
import _filter from 'lodash/fp/filter'
import _map from 'lodash/fp/map'
import _sortBy from 'lodash/fp/sortBy'
import _uniq from 'lodash/fp/uniq'
import _flow from 'lodash/fp/flow'

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
 * @desc Note that Bash version 4.3 (at minimum) is required. This version does not follow
 *    symlinks.  Also, since OSX by default has an older version of bash, the function assumes
 *    that the "homebrew install bash" was used to install bash into "/usr/local/bin/bash".
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
    let bashName = platform() === 'darwin' ? '/usr/local/bin/bash' : 'bash'
    let cp = spawn(bashName, bashCommandLine, { cwd: basedir })
    let outputBuffer = Buffer.alloc(0)
    cp.stdout.on('data', (data) => {
      outputBuffer = Buffer.concat([ outputBuffer, data ])
    })
    cp.stderr.on('data', (data) => console.error('bash: ' + data))
    cp.on('close', (code) => {
      if (code) {
        observer.error('bash test should finish nicely')
      } else {
        let matches = _flow(
          _filter((t) => t !== ''),
          _map((t) => unixStylePath(t.replace(/\/$/, ''))),
          _sortBy((t) => t.toLowerCase()),
          _uniq
        )(outputBuffer.toString().split(/\r*\n/))
        observer.next({ pattern, matches })
        observer.complete()
      }
    })
  })
}

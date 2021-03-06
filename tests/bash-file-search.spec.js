/* eslint-env jasmine */

import _sortBy from 'lodash/sortBy'
import {bashFileSearch} from '../src/bash-file-search'

const testsPath = __dirname

describe('bash file search', () => {
  it('should return expected file list', (done) => {
    let expected = {
      pattern: '**/*.js',
      matches: [
        'bash-file-search.spec.js',
        'test-file-builder.spec.js',
        'test-helpers.js'
      ]
    }

    bashFileSearch('**/*.js', testsPath)
      .subscribe(
        (found) => {
          found.matches = _sortBy(found.matches, (fn) => fn)
          expect(found).toEqual(expected)
        },
        (err) => done.fail(err),
        () => done()
      )
  })
})

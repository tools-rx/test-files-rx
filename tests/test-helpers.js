/* eslint-env jasmine */

import _sortBy from 'lodash/sortBy'

export function concatListItems (lst, item) {
  lst.push(item)
  return lst
}

export function getSubscriber (done) {
  return {
    next () { },
    error (err) { done.fail(err) },
    complete () { done() }
  }
}

export function sortedFileList (fileList) {
  return _sortBy(fileList, (fn) => fn)
}

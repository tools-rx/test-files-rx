import path from 'path'
import fs from 'fs'
import {Observable} from 'rxjs'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'

const writeFileRx = Observable.bindNodeCallback(fs.writeFile)
const mkdirpRx = Observable.bindNodeCallback(mkdirp)
const rimrafRx = Observable.bindNodeCallback(rimraf)
const symlinkRx = Observable.bindNodeCallback(fs.symlink)

/**
 * @typedef FileSet
 * @type {object}
 * @desc Specification for building a set of test files.
 * @property {Array<string>} localFiles A list of files to create in the local path.
 * @property {Array<string>} localDirectories A list of directories to create in the local path.
 * @property {Array<Array<string>>} symLinks A list of symbolic links to create, consiting of a pair
 *    of paths, where the first item is the symbolic link source, and the second item is the
 *    destination of the symbolic link. This will be created in the local path.
 * @property {Array<string>} rootFiles A list of files to create in the root path.
 * @property {Array<string>} rootDirectories A list of directories to create in the root path.
 * @property {string} rootPath the path that that is specified from the root (like "/tmp/glob-test")
 * @property {string} localPath the path for local files (usually set within the project itself).
 */

/**
 * An const object that represents a default set of test files to generate.
 * @type {FileSet}
 */
export const defaultFileSet = {
  localFiles: [
    'a/.abcdef/x/y/z/a',
    'a/abcdef/g/h',
    'a/abcfed/g/h',
    'a/b/c/d',
    'a/bc/e/f',
    'a/c/d/c/b',
    'a/cb/e/f'
  ],
  localDirectories: [],
  rootFiles: [],
  rootDirectories: [
    'foo',
    'bar',
    'baz',
    'asdf',
    'quux',
    'qwer',
    'rewq'
  ],
  symLinks: [
    [ 'a/symlink/a/b/c', 'a/symlink' ]
  ],
  rootPath: '/tmp/glob-test',
  localPath: null
}

/**
 * Build a set of test files.
 * @param {FileSet} fileSet Options describing the set of files to build.
 * @return {Observable<string>} An observable for the build operation.
 */
export function buildFileSet (fileSet) {
  fileSet = fileSet || {}
  if (!fileSet.localPath) {
    throw new Error('localPath not set')
  }
  if (!fileSet.rootPath) {
    throw new Error('rootPath not set')
  }
  return cleanPath(fileSet.localPath)
    .concat(cleanPath(fileSet.rootPath))
    .ignoreElements()
    .concat(buildFiles(fileSet.localPath, fileSet.localFiles))
    .concat(buildDirectories(fileSet.localPath, fileSet.localDirectories))
    .concat(buildFiles(fileSet.rootPath, fileSet.rootFiles))
    .concat(buildDirectories(fileSet.rootPath, fileSet.rootDirectories))
    .concat(buildSymLinks(fileSet.localPath, fileSet.symLinks))
}

/**
 * Normalizes a path to use forward (Unix-style) slashes.
 * @param {string} path The path to be normalized.
 * @return {string} A normalized path.
 */
export function unixStylePath (path) {
  return path.replace(/\\/g, '/')
}

/**
 * Removes all files from a path.
 * @param {string} basePath The path to be cleaned.
 * @return {Observable<string>} An observable for the clean operation.
 */
export function cleanPath (basePath) {
  return rimrafRx(basePath)
    .mergeMap(() => mkdirpRx(basePath), () => basePath)
}

/**
 * Builds a set of files within a base path.
 * @param {string} basePath The path in which to build files.
 * @param {Array<string>} fileList An array of file names to build within the path. Any paths
 *    included in the name should be relative to the base path.
 * @return {Observable<string>} An observable for the build operation.
 * @desc Only simple content is written to the file.
 */
export function buildFiles (basePath, fileList) {
  return Observable.from(fileList || [])
    .map((fileName) => {
      let full = path.join(basePath, fileName)
      return {
        path: path.dirname(full),
        name: path.basename(full),
        full,
        originalName: fileName
      }
    })
    .mergeMap((file) => mkdirpRx(file.path), (file) => file)
    .mergeMap((file) => writeFileRx(file.full, `content ${file.name}`), (file) => file.originalName)
}

/**
 * Builds a set of directories within a base path.
 * @param {string} basePath The path in which to build directories.
 * @param {Array<string>} directoryList An array of directory names to build within the path. Any paths
 *    included in the name should be relative to the base path.
 * @return {Observable<string>} An observable for the build operation.
 */
export function buildDirectories (basePath, directoryList) {
  return Observable.from(directoryList || [])
    .map((directoryName) => {
      let dirName = path.join(basePath, directoryName)
      return {
        dirName,
        originalName: directoryName
      }
    })
    .mergeMap((directory) => mkdirpRx(directory.dirName), (directory) => directory.originalName)
}

/**
 * Builds a set of symbolic links within a base path.
 * @param {string} basePath The path in which to build files.
 * @param {Array<Array<string>>} symLinkList An array of pairs of names to build within the path, where the
 *    first item is the source of the link and the second item is the path that the link points to.
 * @return {Observable<string>} An observable for the build operation.
 */
export function buildSymLinks (basePath, symLinkList) {
  return Observable.from(symLinkList || [])
    .map((paths) => {
      let [symLinkName, directoryName] = paths
      let dirName = path.join(basePath, directoryName)
      let symLink = path.join(basePath, symLinkName)
      return { dirName, symLink, originalName: symLinkName }
    })
    .mergeMap((info) => {
      let symLinkPath = path.dirname(info.symLink)
      return mkdirpRx(symLinkPath).map(() => info)
    })
    .mergeMap((info) => {
      return symlinkRx(info.dirName, info.symLink, 'junction').map(() => info.originalName)
    })
}

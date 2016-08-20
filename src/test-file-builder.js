import path from 'path'
import fs from 'fs'
import {Observable} from 'rxjs'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'

export const ROOT_PATH = '/tmp/glob-test'
export const LOCAL_PATH = path.join(__dirname, '..', 'glob-test')

const writeFileRx = Observable.bindNodeCallback(fs.writeFile)
const mkdirpRx = Observable.bindNodeCallback(mkdirp)
const rimrafRx = Observable.bindNodeCallback(rimraf)
const symlinkRx = Observable.bindNodeCallback(fs.symlink)

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
  ]
}

export function buildFileSet (fileSet) {
  fileSet = fileSet || {}
  return cleanPath(localWorkPath())
    .concat(cleanPath(rootWorkPath()))
    .ignoreElements()
    .concat(buildFiles(LOCAL_PATH, fileSet.localFiles))
    .concat(buildDirectories(LOCAL_PATH, fileSet.localDirectories))
    .concat(buildFiles(ROOT_PATH, fileSet.rootFiles))
    .concat(buildDirectories(ROOT_PATH, fileSet.rootDirectories))
    .concat(buildSymLinks(LOCAL_PATH, fileSet.symLinks))
}

export function unixStylePath (path) {
  return path.replace(/\\/g, '/')
}

export function rootWorkPath (offsetPath) {
  return offsetPath ? path.join(ROOT_PATH, offsetPath) : ROOT_PATH
}

export function localWorkPath (offsetPath) {
  return offsetPath ? path.join(LOCAL_PATH, offsetPath) : LOCAL_PATH
}

export function cleanPath (basePath) {
  return rimrafRx(basePath)
    .mergeMap(() => mkdirpRx(basePath), () => basePath)
}

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

export function buildSymLinks (basePath, symLinkList) {
  return Observable.from(symLinkList || [])
    .map((paths) => {
      let [symLinkName, directoryName] = paths
      let dirName = path.join(basePath, directoryName)
      let symLink = path.join(basePath, symLinkName)
      return { dirName, symLink, originalName: symLinkName }
    })
    .mergeMap((info) => {
      let symLinkPath = info.symLink
      if (process.platform === 'win32') {
        symLinkPath = path.dirname(symLinkPath)
      }
      return mkdirpRx(symLinkPath).map(() => info)
    })
    .mergeMap((info) => {
      return symlinkRx(info.dirName, info.symLink, 'junction').map(() => info.originalName)
    })
}

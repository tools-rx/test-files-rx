import path from 'path'
import fs from 'fs'
import {Observable} from 'rxjs'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'

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
  ],
  rootPath: '/tmp/glob-test',
  localPath: null
}

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

export function unixStylePath (path) {
  return path.replace(/\\/g, '/')
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

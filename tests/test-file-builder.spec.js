/* eslint-env jasmine */

import path from 'path'
import fs from 'fs'
import {
  ROOT_PATH,
  LOCAL_PATH,
  unixStylePath,
  rootWorkPath,
  localWorkPath,
  cleanPath,
  buildFiles,
  buildDirectories,
  buildSymLinks,
  buildFileSet,
  defaultFileSet
} from '../src/test-file-builder'
import mkdirp from 'mkdirp'
import {Observable} from 'rxjs'
import {bashFileSearch, emptyBashFileSearchResult} from '../src/bash-file-search'
import {concatListItems, getSubscriber, sortedFileList} from './test-helpers'

const writeFileRx = Observable.bindNodeCallback(fs.writeFile)
const mkdirpRx = Observable.bindNodeCallback(mkdirp)

describe('test file builder', () => {
  describe('unix style path', () => {
    it('should transform back slash characters to forward slash', () => {
      expect(unixStylePath('a\\b\\c\\file.txt')).toBe('a/b/c/file.txt')
    })
    it('should leave forward slash characters as is', () => {
      expect(unixStylePath('a/b/c/file.txt')).toBe('a/b/c/file.txt')
    })
  })

  describe('work paths', () => {
    it('should be exepected root work path', () => {
      expect(ROOT_PATH).toBe('/tmp/glob-test')
    })
    it('should be exepected work path', () => {
      expect(unixStylePath(LOCAL_PATH)).toBe(unixStylePath(path.join(__dirname, '..', 'glob-test')))
    })
    it('should provide default root work path', () => {
      expect(unixStylePath(rootWorkPath())).toBe('/tmp/glob-test')
    })
    it('should provide offset root work path', () => {
      expect(unixStylePath(rootWorkPath('a/b/c/file.txt'))).toBe('/tmp/glob-test/a/b/c/file.txt')
    })
    it('should provide default local work path', () => {
      let expected = unixStylePath(path.join(__dirname, '..', 'glob-test'))
      expect(unixStylePath(localWorkPath())).toBe(expected)
    })
    it('should provide offset root work path', () => {
      let expected = unixStylePath(path.join(__dirname, '..', 'glob-test', 'a', 'b', 'c', 'file.txt'))
      expect(unixStylePath(localWorkPath('a/b/c/file.txt'))).toBe(expected)
    })
  })

  describe('clean path', () => {
    it('should remove contents of path', (done) => {
      mkdirpRx(localWorkPath('a/b/c'))
        .mergeMap(() => writeFileRx(localWorkPath('a/b/c/file.txt'), 'some content'))
        .mergeMap(() => cleanPath(localWorkPath()))
        .do((path) => {
          expect(unixStylePath(path)).toBe(unixStylePath(localWorkPath()))
        })
        .mergeMap(() => bashFileSearch('**/*', localWorkPath()))
        .do((result) => {
          expect(result).toEqual(emptyBashFileSearchResult)
        })
        .subscribe(getSubscriber(done))
    })
  })

  describe('build files', () => {
    beforeEach((done) => {
      cleanPath(localWorkPath()).subscribe(getSubscriber(done))
    })

    it('should return empty list for undefined file list', (done) => {
      buildFiles(localWorkPath())
        .reduce(concatListItems, [])
        .do((fileList) => {
          expect(fileList).toEqual([])
        })
        .flatMap(() => bashFileSearch('**/*', localWorkPath()))
        .do((actual) => {
          expect(actual).toEqual(emptyBashFileSearchResult)
        })
        .subscribe(getSubscriber(done))
    })

    it('should create single file', (done) => {
      let buildList = [
        'a/b/c/file.txt'
      ]
      let expected = {
        pattern: '**/*',
        matches: [
          'a',
          'a/b',
          'a/b/c',
          'a/b/c/file.txt'
        ]
      }
      buildFiles(localWorkPath(), buildList)
        .reduce(concatListItems, [])
        .do((fileList) => {
          expect(fileList).toEqual(buildList)
        })
        .flatMap(() => bashFileSearch('**/*', localWorkPath()))
        .do((actual) => {
          expect(actual).toEqual(expected)
        })
        .subscribe(getSubscriber(done))
    })

    it('should create multiple files', (done) => {
      let buildList = [
        'a/b/c/one.txt',
        'x/y/z/two.txt',
        'a/three.txt',
        'x/v/four.txt'
      ]
      let expected = {
        pattern: '**/*',
        matches: [
          'a',
          'a/b',
          'a/b/c',
          'a/b/c/one.txt',
          'a/three.txt',
          'x',
          'x/v',
          'x/v/four.txt',
          'x/y',
          'x/y/z',
          'x/y/z/two.txt'
        ]
      }
      buildFiles(localWorkPath(), buildList)
        .reduce(concatListItems, [])
        .do((fileList) => {
          expect(sortedFileList(fileList)).toEqual(sortedFileList(buildList))
        })
        .flatMap(() => bashFileSearch('**/*', localWorkPath()))
        .do((actual) => {
          expect(sortedFileList(actual.matches)).toEqual(sortedFileList(expected.matches))
        })
        .subscribe(getSubscriber(done))
    })
  })

  describe('build directories', () => {
    beforeEach((done) => {
      cleanPath(localWorkPath()).subscribe(getSubscriber(done))
    })

    it('should return empty list for undefined directory list', (done) => {
      buildDirectories(localWorkPath())
        .reduce(concatListItems, [])
        .do((dirList) => {
          expect(dirList).toEqual([])
        })
        .mergeMap(() => bashFileSearch('**/*', localWorkPath()))
        .do((actual) => {
          expect(actual).toEqual(emptyBashFileSearchResult)
        })
        .subscribe(getSubscriber(done))
    })

    it('should create single directory', (done) => {
      let buildList = [
        'a/b/c'
      ]
      let expected = {
        pattern: '**/*',
        matches: [
          'a',
          'a/b',
          'a/b/c'
        ]
      }
      buildDirectories(localWorkPath(), buildList)
        .reduce(concatListItems, [])
        .do((dirList) => {
          expect(dirList).toEqual(buildList)
        })
        .mergeMap(() => bashFileSearch('**/*', localWorkPath()))
        .do((actual) => {
          expect(actual).toEqual(expected)
        })
        .subscribe(getSubscriber(done))
    })

    it('should create multiple directories', (done) => {
      let buildList = [
        'a/b/c',
        'x/y/z',
        'a/x/y/z',
        'x/v'
      ]
      let expected = {
        pattern: '**/*',
        matches: [
          'a',
          'a/b',
          'a/b/c',
          'a/x',
          'a/x/y',
          'a/x/y/z',
          'x',
          'x/y',
          'x/y/z',
          'x/v'
        ]
      }
      buildDirectories(localWorkPath(), buildList)
        .reduce(concatListItems, [])
        .do((dirList) => {
          expect(sortedFileList(dirList)).toEqual(sortedFileList(buildList))
        })
        .flatMap(() => bashFileSearch('**/*', localWorkPath()))
        .do((actual) => {
          expect(sortedFileList(actual.matches)).toEqual(sortedFileList(expected.matches))
        })
        .subscribe(getSubscriber(done))
    })
  })

  describe('build symbolic links', () => {
    beforeEach((done) => {
      cleanPath(localWorkPath()).subscribe(getSubscriber(done))
    })

    it('should return empty list for undefined symlink path list', (done) => {
      buildSymLinks(localWorkPath())
        .reduce(concatListItems, [])
        .do((fileList) => {
          expect(fileList).toEqual([])
        })
        .flatMap(() => bashFileSearch('**/*', localWorkPath()))
        .do((actual) => {
          expect(actual).toEqual(emptyBashFileSearchResult)
        })
        .subscribe(getSubscriber(done))
    })

    it('should create symbolic link', (done) => {
      let links = [
        [ 'a/symlink/a/b/c', 'a/symlink/a' ]
      ]
      let expected = {
        'pattern': '**/*',
        'matches': [
          'a',
          'a/symlink',
          'a/symlink/a',
          'a/symlink/a/b',
          'a/symlink/a/b/c',
          'a/symlink/a/b/c/b'
        ]
      }
      buildSymLinks(localWorkPath(), links)
        .reduce(concatListItems, [])
        .do((symLinkList) => {
          expect(sortedFileList(symLinkList)).toEqual(sortedFileList(links.map((v) => v[0])))
        })
        .flatMap(() => bashFileSearch('**/*', localWorkPath()))
        .do((actual) => {
          expect(sortedFileList(actual.matches)).toEqual(sortedFileList(expected.matches))
        })
        .subscribe(getSubscriber(done))
    })
  })

  describe('build file set', () => {
    beforeEach((done) => {
      cleanPath(localWorkPath())
        .concat(cleanPath(rootWorkPath()))
        .subscribe(getSubscriber(done))
    })

    it('should build empty file set', (done) => {
      buildFileSet()
        .reduce(concatListItems, [])
        .do((buildList) => {
          expect(buildList).toEqual([])
        })
        .flatMap(() => {
          return Observable.concat(
            bashFileSearch('**/*', localWorkPath()),
            bashFileSearch('**/*', rootWorkPath()))
            .mergeMap((m) => m.matches)
            .reduce(concatListItems, [])
        })
        .do((actual) => {
          expect(actual).toEqual([])
        })
        .subscribe(getSubscriber(done))
    })

    it('should build default file set', (done) => {
      let expectedBuildFiles = defaultFileSet.localFiles
        .concat(defaultFileSet.localDirectories)
        .concat(defaultFileSet.rootFiles)
        .concat(defaultFileSet.rootDirectories)
        .concat(defaultFileSet.symLinks.map((s) => s[0]))
      let expected = [
        'a',
        'a/abcdef',
        'a/abcdef/g',
        'a/abcdef/g/h',
        'a/abcfed',
        'a/abcfed/g',
        'a/abcfed/g/h',
        'a/b',
        'a/b/c',
        'a/b/c/d',
        'a/bc',
        'a/bc/e',
        'a/bc/e/f',
        'a/c',
        'a/c/d',
        'a/c/d/c',
        'a/c/d/c/b',
        'a/cb',
        'a/cb/e',
        'a/cb/e/f',
        'a/symlink',
        'a/symlink/a',
        'a/symlink/a/b',
        'a/symlink/a/b/c',
        'a/symlink/a/b/c/a',
        'asdf',
        'bar',
        'baz',
        'foo',
        'quux',
        'qwer',
        'rewq'
      ]
      buildFileSet(defaultFileSet)
        .reduce(concatListItems, [])
        .do((buildList) => {
          expect(sortedFileList(buildList)).toEqual(sortedFileList(expectedBuildFiles))
        })
        .flatMap(() => {
          return Observable.concat(
            bashFileSearch('**/*', localWorkPath()),
            bashFileSearch('**/*', rootWorkPath()))
            .mergeMap((m) => m.matches)
            .reduce(concatListItems, [])
        })
        .do((actual) => {
          expect(sortedFileList(actual)).toEqual(sortedFileList(expected))
        })
        .subscribe(getSubscriber(done))
    })
  })
})

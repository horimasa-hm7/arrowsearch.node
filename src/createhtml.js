const fs = require('fs')
const iconv = require('iconv-lite');//shift-jis読み込み
const config = require('config')
const tika = require('tika')
const Path = require('path')
const { resolve } = require('path');
const { rejects } = require('assert');
const logjs = require('./log')

//rootディレクトリ配下のファイル全ての絶対パスを取得する
exports.fileList = () => {
  return new Promise((resolve, rejects) => {
    const root = config.get('Directory.root')
    let all_list = []
    const recursive = (path) => {
      let path_ = path
      let list = fs.readdirSync(path_)
      for (let dir of list) {
        let full_path = `${path}/${dir}`
        let stats = fs.statSync(full_path)
        if (stats.isDirectory()) {
          recursive(full_path)//ディレクトリの場合再度関数を呼び出す
        } else {
          all_list.push(full_path)
        }
      }
    }
    recursive(root)
    if (all_list.length == 0) {
      rejects(new Error('no File /arrowsearch/mount/*'))
    } else {
      logjs.completeLog('fileList')//log書きこみ
      resolve(all_list)
    }
  })
}

//NotesHtm判定
const isNotesHtm = (file) => {
  const reg_NotesHtm = RegExp(config.get('Regexp.noteshtm'))
  return reg_NotesHtm.test(file)
}

//FileServerとsplitファイル判定
const notNotesHtm = (file) => {
  const reg_FileServer = RegExp(config.get('Regexp.file'))
  return reg_FileServer.test(file)
}

//Notesファイルの作成ファイル名の作成
//絶対パスの'/'を'__'に置換してファイル名にする
const makeNotesFilename = (orgpath) => {
  return orgpath.replace(/\//g, '__')
}
//Notesファイルの添付フォルダ作成
const makeAttachpath = (orgpath) => {
  return orgpath.replace(/\.htm$/g, '\.files\/')
}


//Fileserverファイルの作成ファイル名の作成
//絶対パスの'/'を'__'に置換し末尾に.htmをつけファイル名にする
const makeFileFilename = (orgpath) => {
  return orgpath.replace(/\//g, '__').replace(/$/g, '.htm')
}

//全ファイルから各条件でlistにする
exports.cronList = (value) => {//value = allList
  return new Promise((resolve, rejects) => {
    let notesList = value.filter(isNotesHtm)//Noteshtmのフルパス
    let fileList = value.filter(notNotesHtm)//それ以外(Fileserverとsplit)のフルパス
    let attachdirList = notesList.map(makeAttachpath)//NotesHtmの添付ディレクトリフルパスを作成
    logjs.completeLog('cronList')//log書きこみ
    resolve([notesList, attachdirList, fileList])
  })
}



//htmlファイル作成
exports.createAttachFileList = (value) => {//value = [notesList, attachdirList, fileList]
  //Notesの添付ファイルの内Tikaに渡すファイル判定
  const isTikaFile = (file) => {
    const reg_Attach = RegExp(config.get('Regexp.attach'))
    return reg_Attach.test(file)
  }
  return new Promise((resolve, rejects) => {
    let notesList = value[0]
    let attachdirList = value[1]
    let fileList = value[2]
    let attachfileListAll = []//全Notesの添付ディレクトリ内の特定拡張子ファイル
    for (let i = 0; i < notesList.length; i++) {
      //Notesの添付フォルダの存在チェック
      if (fs.existsSync(attachdirList[i])) {
        let allattach_list = fs.readdirSync(attachdirList[i])
        let attachfile_list = []//特定のNotesの添付ディレクトリ内の特定拡張子ファイル
        for (let file of allattach_list) {
          let filepath = attachdirList[i] + file
          //Tikaに読み込ませる拡張子チェック
          if (isTikaFile(filepath)) {
            attachfile_list.push(filepath)//Tikaに渡すファイルリストを作成
          }
        }
        attachfileListAll.push(attachfile_list)
      } else {
        attachfileListAll.push([])
      }
    }
    logjs.completeLog('createAttachFileList')//log書きこみ
    resolve([notesList, attachfileListAll, fileList])
  })
}


exports.Tika = (value) => {//value = [notesList, attachfileListAll, fileList]
  var temptext = []//特定のNotes添付ファイルの各テキスト
  //Notesの添付ファイル文字抽出(テキスト形式)
  const TikaNotes = (path) => {
    return new Promise((resolve, reject) => {
      tika.text(path, (err, text) => {
        let filename = Path.basename(path)
        temptext.push([filename, text])
        resolve([filename, text])
      })
    })
  }
  //Fileserverのファイル文字抽出(xhtml形式)
  const TikaFile = (path) => {
    return new Promise((resolve, reject) => {
      tika.xhtml(path, (err, xhtml) => {
        //console.log('tikaに渡されました' + path)
        //console.log(xhtml)
        resolve(xhtml)
      })
    })
  }
  return new Promise((resolve, rejects) => {
    let notesList = value[0]
    let attachfileListAll = value[1]
    let fileList = value[2]
    //console.log(value)
    let promises = Promise.resolve()
    let attachtext = []//特定のNotes添付ファイルの全テキスト
    let allPromise = []
    let fileXhtml = []
    //notesの添付フォルダ文字抽出
    for (let i = 0; i < attachfileListAll.length; i++) {
      for (let j of attachfileListAll[i]) {
        //n_funcList.push(TikaNotes(j))
        promises = promises.then(TikaNotes.bind(this, j))
      }
      promises.then(() => {
        //console.log(temptext.length)
        return new Promise((resolve, rejects) => {
          attachtext.push(temptext.join('<br>'))
          temptext = []//temptextの初期化
        })
      })
      allPromise.push(promises)
    }
    //fileserverとsplitの文字抽出
    let fpromise = Promise.resolve()
    for (path of fileList) {
      fpromise = fpromise.then(TikaFile.bind(this, path)).then(value => {
        fileXhtml.push(value)
      })
    }
    allPromise.push(fpromise)
    fpromise.then(() => {
      return new Promise((resolve, reject) => {
        logjs.infoLog('Tika', '[fileserver,split]directory OK')//log書きこみ
      })
    })
    Promise.all(allPromise).then(values => {//notesと[fileserver,split]の両方の終了を待つ
      logjs.infoLog('Tika', '[notes]directory OK')//log書きこみ
      logjs.completeLog('Tika')//log書きこみ
      resolve([notesList, attachtext, fileList, fileXhtml])
    })
  })
}

exports.writeFile = (value) => {//value = [notesList, attachtext, fileList, fileXhtml]
  let notesList = value[0]
  let notesdocIdList = []//Notesファイルのdocid
  let attachText = value[1]
  let fileList = value[2]
  let filedocIdList = []//Fileserverとsplitのdocid
  let makefileFileList = fileList.map(makeFileFilename)
  let fileXhtml = value[3]
  let makeNotesFileList = notesList.map(makeNotesFilename)
  return new Promise((resolve, rejects) => {
    //Notesのファイル書きこみ
    for (let i = 0; i < notesList.length; i++) {
      //元htmファイル読み込み
      let win_text = fs.readFileSync(notesList[i])
      let attachtext = attachText[i] + '</BODY>'//添付ファイルテキスト
      let atext = iconv.decode(win_text, 'Shift_JIS') //shift-jisのファイルをdecode
      atext = atext.replace('<BODY>', '<BODY><div>').replace('</BODY>', '</div></BODY>').replace('charset=Shift_JIS">', 'charset=UTF-8">').replace('</BODY>', attachtext).replace(/　/g, ' ').replace(/,/g, ' ')
      //リンク作成用
      let notesdocId = atext.match(/<TITLE>(\n|\r|\r\n)*(.*?)(\n|\r|\r\n)*<\/TITLE>/g)
      let title = notesdocId[0].replace(/(\n|\r|\r\n)/g, ' ').replace(/,/g, ' ').replace(/&amp;/g, ' ')
      notesdocIdList.push(title.replace(/<TITLE>/, '').replace(/<\/TITLE>/, ''))
      atext = atext.replace(/<TITLE>(\n|\r|\r\n)*(.*?)(\n|\r|\r\n)*<\/TITLE>/g, title)
      //書きこみ
      const storage = config.get('Directory.storage')
      fs.writeFileSync(`${storage}/temp/${makeNotesFileList[i]}`, atext, 'utf-8')
    }
    logjs.infoLog('writeFile', '[notes]directory OK')//log書きこみ

    //Fileファイル書きこみ
    //Fileserverファイルかsplitファイルかの判定
    const isSplitFile = (file) => {
      const reg_Split = RegExp(config.get('Regexp.split'))
      return reg_Split.test(file)
    }

    for (let i = 0; i < fileList.length; i++) {
      if (isSplitFile(fileList[i])) {//splitファイルのtitle作成
        let words = fileList[i].split('/')
        let reversed = words.reverse()
        var filedocId = reversed[1] + ' ' + reversed[0].replace(/#.*?$/g, '').replace(/,/g, '')
        filedocId = filedocId.replace(/(\n|\r|\r\n)/g, ' ').replace(/,/g, ' ').replace(/&amp;/g, ' ')
        var titletext = `<title>${filedocId}</title>`
      } else {//fileファイルのtitle作成
        var filedocId = Path.basename(fileList[i], '.htm').replace(/(\n|\r|\r\n)/g, ' ').replace(/,/g, ' ').replace(/&amp;/g, ' ')
        var titletext = `<title>${filedocId}</title>`
      }
      if (!fileXhtml[i]) {//ファイルの内容が無かったとき(パスワード等)
        logjs.warnLog('writeFile.Files', `${fileList[i]}\n text is Nothing`)//warnlog書きこみ(書き出しは行わないが処理継続)
      } else {
        let atext = fileXhtml[i].replace('<body>', '<body><div>').replace('</body>', '</div></body>').replace(/<title>.*?<\/title>/, titletext).replace(/Shift_JIS"\/>/g, 'UTF-8"/>').replace(/　/g, ' ')
        //リンク作成用
        filedocIdList.push(filedocId)
        //書きこみ
        const storage = config.get('Directory.storage')
        fs.writeFileSync(`${storage}/temp/${makefileFileList[i]}`, atext, 'utf-8')
      }
    }
    logjs.infoLog('writeFile', '[fileserver,split]directory OK')//log書きこみ
    logjs.completeLog('writeFile')//log書きこみ
    resolve([notesList, notesdocIdList, fileList, filedocIdList])
  })
}

exports.compareHtml = (value) => {//value = [notesList, notesdocIdList, fileList, filedocIdList]
  return new Promise((resolve, rejects) => {
    let storage = config.get('Directory.storage')
    let storageTemp = `${storage}/temp/`
    let storageHtml = `${storage}/html/`
    let tempList = fs.readdirSync(storageTemp)
    let updateCheck = [false, false, false]
    for (let i = 0; i < tempList.length; i++) {
      let tempFilename = Path.basename(tempList[i])
      if (!fs.existsSync(`${storageHtml}${tempFilename}`)) {//htmlフォルダに無いとき
        fs.writeFileSync(`${storageHtml}${tempFilename}`, fs.readFileSync(`${storageTemp}${tempFilename}`))
        updateCheck[0] = true
      } else {//htmlフォルダに有
        let tempfile = fs.readFileSync(`${storageTemp}${tempFilename}`, 'utf-8')
        let htmlfile = fs.readFileSync(`${storageHtml}${tempFilename}`, 'utf-8')

        if (tempfile === htmlfile) {//有るが更新がない
          updateCheck[1] = true
        } else {//有り更新もある
          fs.writeFileSync(`${storageHtml}${tempFilename}`, fs.readFileSync(`${storageTemp}${tempFilename}`))
          updateCheck[2] = true
        }
      }
    }
    let msg = ''
    if (updateCheck[0]) {//htmlフォルダに無いとき
      msg = 'new create File, '
    }
    if (updateCheck[2]) {//有るが更新がない
      msg += 'update File, '
    }
    if (updateCheck[1]) {//有り更新もある
      msg += 'no update File'
    }
    logjs.infoLog('compareHtml', msg)//log書きこみ
    logjs.completeLog('compareHtml')//log書きこみ
    resolve(value)
  })
}

//tempフォルダを作成(既にある場合は全削除して作成)
exports.initTemp = (value) => {//value = [notesList, attachdirList, fileList]
  return new Promise((resolve, rejects) => {
    const storage = config.get('Directory.storage') + '/temp'
    if (!fs.existsSync(storage)) {
      fs.mkdirSync(storage);
      logjs.infoLog('initTemp', './storage/temp  create')//log書きこみ
    } else {
      let rm_list = fs.readdirSync(storage) // storage/temp内のファイルを全取得
      for (let rm of rm_list) {
        fs.unlinkSync(`${storage}/${rm}`)
      }
      fs.rmdirSync(storage)//ディレクトリ削除
      fs.mkdirSync(storage)//ディレクトリ作成
      logjs.infoLog('initTemp', './storage/temp  re-create')//log書きこみ
    }
    logjs.completeLog('initTemp')//log書きこみ
    resolve(value)
  })
}

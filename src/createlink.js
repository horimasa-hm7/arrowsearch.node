const config = require('config')
const fs = require('fs');
const Path = require('path')
const { resolve } = require('path');
const { reject } = require('async');
const logjs = require('./log')
const execSync = require('child_process').execSync;


exports.createNoteslink = (value) => {//value  =[notesList, notesdocIdList, fileList, filedocIdList]
  let writeList = []//csvに書きこむ情報
  return new Promise((resolve, reject) => {
    const notesList = value[0]
    const notesdocIdList = value[1]
    for (let i = 0; i < notesList.length; i++) {
      let id = Path.basename(notesList[i], '.htm')
      let notesDBpath = config.get('Link.notes')
      for (let key in notesDBpath) {
        //configに書かれているLink.notesのkeyの名前に一致しているか(一致していないものは書き出しされない=>決め打ちのため)
        if (notesList[i].indexOf(key) != -1) {
          var url = `${notesDBpath[key]}/${key}/${id}`
          writeList.push(notesdocIdList[i] + ',' + url)
        }
      }
    }
    logjs.completeLog('createNoteslink')//log書きこみ
    resolve([writeList, value[2], value[3]])
  })
}

exports.createFilelink = (value) => {//value =[writeList, value[2]//fileList, value[3]//filedocIdList]
  let writeList = value[0]
  let fileList = value[1]
  let filedocIdList = value[2]
  return new Promise((resolve, reject) => {
    //fileserver用前処理
    const cmd = config.get('Shellcmd.mount')
    const result = execSync(cmd).toString()
    let mountList = result.match(/.*?username/gim)//実際にはtestresmount => result

    for (let i = 0; i < fileList.length; i++) {
      const reg_Split = RegExp(config.get('Regexp.split'))
      //Splitのリンク
      if (reg_Split.test(fileList[i])) {
        let words = fileList[i].split('/')
        let reversed = words.reverse()
        let page = reversed[0].match(/#.*?.pdf$/gi)
        if(!page){
          reject(new Error(`no FileName Match #---.pdf\n${fileList[i]}`))
        }else{
          let pageURL = reversed[1] + '.pdf' + page[0].replace('.pdf', '').replace(/(#00|#0)/, '#page=')
          let splitFilepath = config.get('Link.split')
          for (let key in splitFilepath) {
            //configに書かれているLink.splitのkeyの名前に一致しているか(一致していないものは書き出しされない=>決め打ちのため)
            if (fileList[i].indexOf(key) != -1) {
              var url = `${splitFilepath[key]}/${pageURL}`
              writeList.push(filedocIdList[i] + ',' + url)
            }
          }
        }
      } else if (mountList) {//fileserverのリンク
        var linkpathList = []
        var linuxpathList = []
        for (p of mountList) {
          let temp = p.split(' on ')
          let linkpath = temp[0]
          let linuxpath = temp[1].split(' type ')[0]
          linkpathList.push(linkpath)
          linuxpathList.push(linuxpath)
        }
        for (let k = 0; k < linuxpathList.length; k++) {
          let re = RegExp(`^${linuxpathList[k]}`)
          if (re.test(fileList[i])) {
            var url = 'file:' + fileList[i].replace(linuxpathList[k], linkpathList[k])
          }
        }
        writeList.push(filedocIdList[i] + ',' + url)
      }
    }
    logjs.completeLog('createFilelink')//log書きこみ
    resolve(writeList)
  })
}

exports.writeLink = (value) => {//value = writeList
  return new Promise((resolve, reject) => {
    if (value.length == 0) {
      reject(new Error('write row is Nothing'))
    } else {
      fs.writeFileSync('./link.csv', '')
      for (v of value) {
        fs.appendFileSync('./link.csv', v + '\n')
      }
      logjs.completeLog('writeLink')//log書きこみ
      resolve()
    }
  })
}

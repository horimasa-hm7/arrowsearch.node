const { resolve } = require('path');
const { reject } = require('async');
const execSync = require('child_process').execSync;
const config = require('config')
const logjs = require('./log')

exports.crawlerJava = (value) => {//value = [notesList, notesdocIdList, fileList, filedocIdList]
  return new Promise((resolve, reject) => {
    let cmd = config.get('Shellcmd.crawler')
    //crawler実行
    const result = execSync(cmd).toString()
    let err = result.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} ERROR\:.*/gm)
    if (err) {
      reject(new Error(err))
    } else {
      logjs.ibmcrawlerLog(result)//log書きこみ
      logjs.completeLog('crawlerJava')//log書きこみ
      resolve(value)
    }
  })
}
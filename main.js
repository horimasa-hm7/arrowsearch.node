//modules
const config = require('config')
const createhtml = require('./src/createhtml')
const crawler = require('./src/ibmcrawler')
const createlink = require('./src/createlink')
const dbaccess = require('./src/dbaccess')
const logjs = require('./src/log')
const log4js = require('log4js'); //log4jsモジュール読み込み

//logger
log4js.configure('./config/log4js-setting.json'); //設定ファイル読み込み
let logAppender = log4js.getLogger('MAIN'); //リクエスト用のロガー取得
const startLog = () => {
  return new Promise((resolve, reject) => {
    logAppender.info('*****Node crawler START*****')
    resolve()
  })
}

const endLog = () => {
    logAppender.info('*****Node crawler END*****')
}

//resolveを使うと次の関数に値が自動的に渡される.

startLog()
  .then(createhtml.fileList).catch((err) => {
    logjs.errorLog(err, 'fileList')
  })
  .then(createhtml.cronList).catch((err) => {
    logjs.errorLog(err, 'cronList')
  })
  .then(createhtml.createAttachFileList).catch((err) => {
    logjs.errorLog(err, 'createAttachFileList')
  })
  .then(createhtml.Tika).catch((err) => {
    logjs.errorLog(err, 'Tika')
  })
  .then(createhtml.writeFile).catch((err) => {
    logjs.errorLog(err, 'writeFile')
  })
/*  .then(createhtml.compareHtml).catch((err) => {
    logjs.errorLog(err, 'compareHtml')
  })
   .then(createhtml.initTemp).catch((err) => {
     logjs.errorLog(err, 'initTemp')
   })
   .then(crawler.crawlerJava).catch((err) => {
     logjs.errorLog(err, 'crawlerJava')
   })
   .then(createlink.createNoteslink).catch((err) => {
     logjs.errorLog(err, 'createNoteslink')
   })
   .then(createlink.createFilelink).catch((err) => {
     logjs.errorLog(err, 'createFilelink')
   })
   .then(createlink.writeLink).catch((err) => {
     logjs.errorLog(err, 'writeLink')
   })
   .then(dbaccess.dbconnect).catch((err) => {
     logjs.errorLog(err, 'dbconnect')
   })*/
   .then(endLog)


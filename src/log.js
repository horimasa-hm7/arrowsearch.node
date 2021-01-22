const log4js = require('log4js'); //log4jsモジュール読み込み

const setLogger = (category) => {
  let logAppender = log4js.getLogger(category); //ロガー取得
  return logAppender
}

exports.infoLog = (name, msg) => {
  setLogger(name).info(msg)
}

exports.completeLog = (name) => {
  setLogger(name).info('Complete')
}

exports.warnLog = (name, msg) => {
  setLogger(name).warn(msg)
}

exports.errorLog = (err, name) => {
  setLogger(name).error(err)
  setLogger(name).error('ERROR *****Node crawler END*****')
  process.exit()
}
exports.ibmcrawlerLog = (result) => {
  setLogger('ibmcrawler').info('\n' + result)
}
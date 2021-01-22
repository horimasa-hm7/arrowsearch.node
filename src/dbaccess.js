const mysql = require('mysql');
const { resolve } = require('path');
const { reject } = require('async');
const config = require('config');
const logjs = require('./log')

const exeQuery = (cmd, connection) => {
  return new Promise((resolve, reject) => {
    connection.query(cmd, (err, rows, fields) => {
      if (err){
        reject(err)
      }else{
        logjs.infoLog('exeQuery', rows);
        resolve(rows)
      }
    });
  })
}

exports.dbconnect = () => {
  return new Promise((resolves, reject) => {
    const connection = mysql.createConnection({
      host: config.get("MYSQL.host"),
      user: config.get("MYSQL.user"),
      password: config.get('MYSQL.password'),
      port: config.get('MYSQL.port'),
      database: config.get('MYSQL.database'),
      ssl  : {
            ca : fs.readFileSync(config.get('MYSQL.ssl'))
  }
    })
    const sqlcmd1 = config.get('MYSQL.sqlcmd1')
    const sqlcmd2 = config.get('MYSQL.sqlcmd2')
    connection.connect(err => {
      if (err) {
        reject(new Error(err))//connectError throw
      } else {
        logjs.infoLog('dbconnect', 'DB connect OK')
        let cmdList = [sqlcmd1, sqlcmd2]
        let promises = Promise.resolve()
        for (cmd of cmdList) {
          promises = promises.then(exeQuery.bind(this, cmd, connection)).catch(err => {
            reject(new Error(err))
          })
        }
        promises.then(() => {
          return new Promise((resolve, reject) => {
            logjs.completeLog('dbconnect')//log書きこみ
            resolve(connection.end())
	    resolves()
          })
        })
      }
    });
  });
}

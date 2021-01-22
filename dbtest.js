//modules
const config = require('config')
const mysql = require('mysql');
const fs = require('fs')

const dbconnect = () => {
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
        console.log('dbconnect')
	connection.end()
      }
    });
  });
}

dbconnect().catch(err => {console.log(err) })

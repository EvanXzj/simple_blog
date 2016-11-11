var settings = require('../settings'),
	DB = require('mongodb').Db,
	Connection = require('mongodb').Connection,
	Server = require('mongodb').Server;

module.exports = new DB(settings.db,new Server(settings.host,settings.port),{safe:true});
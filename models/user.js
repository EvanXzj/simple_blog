var mongodb = require('./db');
var crypto = require('crypto');

function User(user){
	this.name = user.name;
	this.password = user.password;
	this.email = user.email;
};

module.exports = User;

//存储用户信息
User.prototype.save = function(cb){
	var md5 = crypto.createHash('md5'),
		email_MD5 = md5.update(this.email.toLowerCase()).digest('hex'),//先转成小写
		head = "http://s.gravatar.com/avatar/" + email_MD5 + "?s=48&r=r";
		console.log('email_MD5:'+email_MD5);
		console.log('head:'+head);
	var user ={
		name:this.name,
		password:this.password,
		email:this.email,
		head:head
	};
	//open database connection
	mongodb.open(function(err,db){
		if(err){
			return cb(err);
		}
		db.collection('users',function(err,collection){
			if(err){
				db.close();
				return cb(err);
			}
			collection.insert(user,{
				safe:true
			},function(err,user){
				mongodb.close();
				if(err){
					return cb(err);
				}
				console.log('user[0]:');
				console.log(user[0]);
				cb(null,user[0]);//成功！err 为 null，并返回存储后的用户文档
			});
		});
	});
};

//read user information
User.get = function(name,cb){
	mongodb.open(function(err,db){
		if(err){
			return cb(err);
		}
		db.collection('users',function(err,collection){
			if(err){
				mongodb.close();
				return cb(err);
			}
			collection.findOne({name:name},function(err,user){
				mongodb.close();
				if(err){
					return cb(err);
				}
				cb(null,user);//成功！返回查询的用户信息
			});
		});
	});
}
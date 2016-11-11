var mongodb = require('./db');

function Comment(name,day,title,comment){
	this.name = name;
	this.day = day;
	this.title = title;
	this.comment = comment;
}

module.exports = Comment;

//存储一条留言信息
Comment.prototype.save = function(cb){
	var name = this.name,
		day = this.day,
		title = this.title,
		comment = this.comment;
	//打开数据库
	mongodb.open(function(err,db){
		if(err){
			return cb(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return cb(err);
			}
			//通过用户名、时间及标题查找文档，并把一条留言对象添加到该文档的 comments 数组里
			collection.update({
				"name":name,
				"time.day":day,
				"title":title
			},{$push:{"comments":comment}},function(err){
				mongodb.close();
				if(err){
					return cb(err);
				}
				cb(null);
			});
		});
	});
};
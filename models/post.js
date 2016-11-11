var mongodb = require('./db');
var markdown = require('markdown').markdown;//markdown

function Post(name,head,title,tags,post){
	this.name = name;
	this.head = head;
	this.title = title;
	this.tags = tags;
	this.post = post;
};

module.exports = Post;

Post.prototype.save = function(cb){
	var date = new Date();
	//存储各种时间格式，方便以后扩展
	var time = {
		date: date,
		year : date.getFullYear(),
		month : date.getFullYear() + "-" + (date.getMonth() + 1),
		day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
		minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
		date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) 
	};
	//要存入数据库的文档
	var post = {
		name: this.name,
		head:this.head,
		time: time,
		title: this.title,
		tags:this.tags,
		post: this.post,
		comments:[],//留言评论
		reprint_info:{},//转载信息
		pv:0//访问统计
	};
	mongodb.open(function(err,db){
		if(err){
			return cb(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				db.close();
				return cb(err);
			}
			collection.insert(post,{safe:true},function(err,doc){
				mongodb.close();
				if(err){
					return cb(err);
				}
				cb(null);
			});
		});
	});
};

//一次获取十篇文章
Post.getTen = function(name,page,cb){//version 1-->无分页  获取一个人的所有文章（传入参数 name）或获取所有人的文章（不传入参数）
	mongodb.open(function(err,db){
		if(err){
			return cb(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				db.close();
				return cb(err);
			}
			var query = {};
			if(name){
				query.name = name;
			}
			 //使用 count 返回特定查询的文档数 total
			collection.count(query,function(err,total){
				//根据 query 对象查询，并跳过前 (page-1)*10 个结果，返回之后的 10 个结果
				collection.find(query,{
					skip:(page-1)*10,
					limit:10
				}).sort({time:-1}).toArray(function(err,docs){
					mongodb.close();
					if(err){
						return cb(err);
					}
					//解析 markdown 为 html
					docs.forEach(function(doc){
						doc.post = markdown.toHTML(doc.post);
					});
					cb(null,docs,total);
				});
			});
		});
	});
};

//根据用户名、发表日期及文章名精确获取一篇文章。(HTML格式)
Post.getOne = function(name,day,title,cb){
	mongodb.open(function(err,db){
		if(err){
			return cb(err);
		}
		//读取posts集合
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return cb(err);
			}
			//根据用户名、发表日期及文章名进行查询
			collection.findOne({
				"name":name,
				"time.day":day,
				"title":title
			},function(err,doc){
				if(err){
					mongodb.close();
					return cb(err);
				}
				//解析 markdown 为 html
				//doc.post = markdown.toHTML(doc.post);  version 1 不支持留言评论

				//version 2 支持留言评论，且留言也支持markdown语法
				if(doc){
					//每访问 1 次，pv 值增加 1
					collection.update({
						"name":name,
						"time.day":day,
						"title":title
					},{$inc:{"pv":1}},function(err){
						mongodb.close();
						if(err){
							return cb(err);
						}
					});

					doc.post = markdown.toHTML(doc.post);
					doc.comments.forEach(function(comment,index){
						comment.content = markdown.toHTML(comment.content);
					});
				}
				cb(null,doc);//返回查询的一篇文章
			});
		});
	});
};

//编辑,返回查询的一篇文章（markdown 格式）
Post.edit = function(name,day,title,cb){
	mongodb.open(function(err,db){
		if(err){
			return cb(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return cb(err);
			}
			collection.findOne({
				"name":name,
				"time.day":day,
				"title":title
			},function(err,doc){
				mongodb.close();
				if(err){
					return cb(err);
				}
				cb(null,doc);//返回查询的一篇文章（markdown 格式）
			});
		});
	});
};

//保存修改
Post.update = function(name,day,title,post,cb){
	mongodb.open(function(err,db){
		if(err){
			return cb(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return cb(err);
			}
			collection.update({
				"name":name,
				"time.day":day,
				"title":title
			},{$set:{post:post}},function(err){
				mongodb.close();
				if(err){
					return cb(err);
				}
				cb(null);//更新成功。
			});
		});
	});
};

//删除一篇文章
Post.remove = function(name, day, title, callback) {
  //打开数据库
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      //查询要删除的文档
      collection.findOne({
        "name": name,
        "time.day": day,
        "title": title
      }, function (err, doc) {
        if (err) {
          mongodb.close();
          return callback(err);
        }
        //如果有 reprint_from，即该文章是转载来的，先保存下来 reprint_from
        var reprint_from = "";
        if (doc.reprint_info.reprint_from) {
          reprint_from = doc.reprint_info.reprint_from;
        }
        console.log('reprint_from:');
        console.log(reprint_from);
        if (reprint_from != "") {
          //更新原文章所在文档的 reprint_to,我们使用了 $pull 来删除数组中的特定项
          collection.update({
            "name": reprint_from.name,
            "time.day": reprint_from.day,
            "title": reprint_from.title
          }, {
            $pull: {
              "reprint_info.reprint_to": {
                "name": name,
                "day": day,
                "title": title
            }}
          }, function (err) {
            if (err) {
              mongodb.close();
              return callback(err);
            }
          });
        }

        //删除转载来的文章所在的文档
        collection.remove({
          "name": name,
          "time.day": day,
          "title": title
        }, {
          w: 1
        }, function (err) {
          mongodb.close();
          if (err) {
            return callback(err);
          }
          callback(null);
        });
      });
    });
  });
};


//归档
//返回所有文章存档信息
Post.getArchive = function(callback) {
  //打开数据库
  mongodb.open(function (err, db) {
    if (err) {
      return callback(err);
    }
    //读取 posts 集合
    db.collection('posts', function (err, collection) {
      if (err) {
        mongodb.close();
        return callback(err);
      }
      //返回只包含 name、time、title 属性的文档组成的存档数组
      collection.find({}, {
        "name": 1,
        "time": 1,
        "title": 1
      }).sort({
        time: -1
      }).toArray(function (err, docs) {
        mongodb.close();
        if (err) {
          return callback(err);
        }
        callback(null, docs);
      });
    });
  });
};

//获取标签
Post.getTags = function(cb){
	mongodb.open(function(err,db){
		if(err){
			return cb(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return cb(err);
			}
			//distinct 用来找出给定键的所有不同值
			collection.distinct('tags',function(err,docs){
				mongodb.close();
				if(err){
					return cb(err);
				}
				cb(null,docs);
			});
		});
	});
};


//返回含有特定标签的所有文章
Post.getTag = function(tag,cb){
	mongodb.open(function(err,db){
		if(err){
			return cb(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return cb(err);
			}     
			//查询所有 tags 数组内包含 tag 的文档
      		//并返回只含有 name、time、title 组成的数组
      		collection.find({"tags":tag},{
      			name:1,
      			time:1,
      			title:1
      		}).sort({time:-1}).toArray(function(err,docs){
      			mongodb.close();
      			if(err){
      				return cb(err);
      			}
      			cb(null,docs);
      		});
		});
	});
};

//文章检索：即根据关键字模糊查询文章标题，且字母不区分大小写。
Post.search = function(keyword,cb){
	mongodb.open(function(err,db){
		if(err){
			return cb(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return cb(err);
			}
			var pattern = new RegExp(keyword,'i');//正则表达式
			console.log('pattern:'+pattern);
			collection.find({
				"title":pattern
			},{
				"name":1,
				"time":1,
				"title":1
			}).sort({time:-1}).toArray(function(err,docs){
				mongodb.close();
				if(err){
					return cb(err);
				}
				cb(null,docs);
			});
		});
	});
};

//转载一篇文章
Post.reprint = function(reprint_from,reprint_to,cb){
	mongodb.open(function(err,db){
		if(err){
			return cb(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return cb(err);
			}
			//找到被转载的文章的原文档
			collection.findOne({
				"name":reprint_from.name,
				"time.day":reprint_from.day,
				"title":reprint_from.title
			},function(err,doc){
				if(err){
					mongodb.close();
					return cb(err);
				}
				var date = new Date();
				var time = {
					date: date,
					year : date.getFullYear(),
					month : date.getFullYear() + "-" + (date.getMonth() + 1),
					day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
					minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
					date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
				};

				delete doc._id;//注意要删掉原来的 _id

				doc.name = reprint_to.name;
				doc.head = reprint_to.head;
				doc.time = time;
				doc.title = (doc.title.search(/[转载]/) > -1) ? doc.title : "[转载]" + doc.title;
				doc.comments = [];
				doc.reprint_info = {"reprint_from":reprint_from};
				doc.pv = 0;

				//更新被转载的原文档的 reprint_info 内的 reprint_to
				collection.update({
					"name":reprint_from.name,
					"time.day":reprint_from.day,
					"title":reprint_from.title
				},{$push:{"reprint_info.reprint_to":{
					"name":doc.name,
					"day":time.day,
					"title":doc.title
				}}},function(err){
					if(err){
						mongodb.close();
						return cb(err);
					}
				});

				 //将转载生成的副本修改后存入数据库，并返回存储后的文档
				 collection.insert(doc,{
				 	safe:true
				 },function(err,post){
				 	mongodb.close();
				 	if(err){
				 		return cb(err);
				 	}
				 	console.log("doc:");
				 	console.log(doc);
				 	cb(null,doc);
				 });
			});
		});
	});
};
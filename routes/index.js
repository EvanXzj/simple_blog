var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var User = require('../models/user.js'),
	Post = require('../models/post.js'),
	Comment = require('../models/comment.js');
var multer = require('multer');//上传第三方中间件

//multer useage
var storage = multer.diskStorage({
	destination:function(req,file,cb){
		cb(null,'./public/images');
	},
	filename:function(req,file,cb){
		cb(null,file.originalname);
	}
});
var upload = multer({
	storage:storage
});

/* GET home page. */
router.get('/', function(req, res, next) {
	//判断是否是第一页，并把请求的页数转换成 number 类型
	var page = parseInt(req.query.p) || 1;
	//查询并返回第 page 页的 10 篇文章
	Post.getTen(null,page,function(err,posts,total){
		//console.log('1');
		if(err){
			//console.log('2');
			posts=[];
		}
		//console.log('3');
		console.log(posts.length);
		res.render('index', { 
				title: 'Blog Home Page',
				posts:posts,
				page:page,
				isFirstPage:(page - 1) == 0,
				isLastPage:((page - 1) * 10 + posts.length) == total,
				user:req.session.user,
				posts:posts,
				success:req.flash('success').toString(),
				error:req.flash('error').toString()
		});
	});
});

/*register page(get)*/
router.get('/reg', checkNotLogin);
router.get('/reg',function(req,res){
	res.render('reg', {
    	title: '注册',
    	user: req.session.user,
    	success: req.flash('success').toString(),
   	 	error: req.flash('error').toString()
  	});
});

/*register (post)*/
router.post('/reg', checkNotLogin);
router.post('/reg',function(req,res){
	var name = req.body.name,
		password = req.body.password,
		password_re = req.body.passwordrepeat;
	console.log('11');
	console.log(req.body);
	console.log(password);
	console.log(password_re);
	if(password_re != password){
		req.flash('error','password_repeat does\'n match the password!');
		return res.redirect('/reg');
	}
	console.log('22');
	var md5 = crypto.createHash('md5'),
		password = md5.update(req.body.password).digest('hex');
	var newUser = new User({
		name:name,
		password:password,
		email:req.body.email
	});
	console.log('33');
	 //检查用户名是否已经存在 
	 User.get(newUser.name,function(err,user){
	 	console.log('44');
	 	if(err){
	 		req.flash('error',err);
	 		return res.redirect('/reg');
	 	}
	 	console.log('55');
	 	if(user){
	 		req.flash('error','User name already existed!');
	 		return res.redirect('/reg');
	 	}
	 	console.log('66');
	 	newUser.save(function(err,user){
	 		console.log('77');
	 		if(err){
	 			req.flash('error',err);
	 			return res.redirect('/reg');
	 		}
	 		console.log('88');
	 		req.flash('success','regist success');
	 		res.redirect('/');
	 	});
	 });
});


/*login page (get)*/
router.get('/login', checkNotLogin);
router.get('/login',function(req,res){
	res.render('login',{
		title:'Login Page',
		user:req.session.user,
		success:req.flash('success').toString(),
		error:req.flash('error').toString()
	});
});

/*login (post)*/
router.post('/login', checkNotLogin);
router.post('/login',function(req,res){
	var md5 = crypto.createHash('md5'),
		password = md5.update(req.body.password).digest('hex');
	User.get(req.body.name,function(err,user){
		if(!user){
			req.flash('error','user does not exist');
			return res.redirect('/login');
		}
		if(user.password != password){
			req.flash('error','password not match');
			return res.redirect('/login');
		}
		req.session.user = user;
		console.log('User:');
	 	console.log(req.session.user);
		req.flash('success','login success');
		res.redirect('/');
	});
});

/*post page(get)*/
router.get('/post', checkLogin);
router.get('/post', function (req, res) {
    res.render('post', {
        title: '发表',
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
    });
});

/*post information (post)*/
router.post('/post', checkLogin);
router.post('/post',function(req,res){
	var currentUser =req.session.user;
	console.log('currentUser.head=:'+currentUser.head);
	var tags = [req.body.tag1,req.body.tag2,req.body.tag3],
		post = new Post(currentUser.name,currentUser.head,req.body.title,tags,req.body.post);
		post.save(function(err){
			if(err){
				req.flash('error',err);
				return res.redirect('/');
			}
			req.flash('success','发布成功');
			res.redirect('/');
		});
});

/*logout*/
router.get('/logout', checkLogin);
router.get('/logout',function(req,res){
	req.session.user = null ;
	req.flash('success','logout success');
	return res.redirect('/');
});

/*upload*/
router.get('/upload',checkLogin);
router.get('/upload',function(req,res){
	res.render('upload',{
		title:'文件上传',
		user:req.session.user,
		success:req.flash('success').toString(),
		error:req.flash('error').toString()
	});
});

router.post('/upload',checkLogin);
router.post('/upload',upload.array('field1',5),function(req,res){
	req.flash('success','文件上传成功');
	res.redirect('/upload');
});
//归档
router.get('/archive', function (req, res) {
  Post.getArchive(function (err, posts) {
    if (err) {
      req.flash('error', err); 
      return res.redirect('/');
    }
    res.render('archive', {
      title: '存档',
      posts: posts,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

//标签页
router.get('/tags',function(req,res){
	Post.getTags(function(err,posts){
		if(err){
			req.flash('error',err);
			return res.redirect('/');
		}
		res.render('tags',{
			title:'标签',
			posts:posts,
			user:req.session.user,
			success:req.flash('success').toString(),
			error:req.flash('error').toString()
		});
	});
});
//获取某个标签下的所有文章
router.get('/tags/:tag',function(req,res){
	Post.getTag(req.params.tag,function(err,posts){
		if(err){
			req.flash('error',err);
			return res.redirect('/');
		}
		res.render('tag',{
			title:'Tag:'+req.params.tag,
			posts:posts,
			user:req.session.user,
			success:req.flash('success').toString(),
			error:req.flash('error').toString()
		});
	});
});
//友情链接
router.get('/links',function(req,res){
	res.render('links',{
		title:'友情链接',
		user: req.session.user,
      	success: req.flash('success').toString(),
      	error: req.flash('error').toString()
	});
});

//文章检索
router.get('/search',function(req,res){
	Post.search(req.query.keyword,function(err,posts){
		console.log('111111');
		if(err){
			console.log('222222');	
			console.log('err'+err);	
			req.flash('error',err);
			return res.redirect('/');
		}
		res.render('search',{
			title:"Search: "+req.query.keyword,
			posts:posts,
			user: req.session.user,
      		success: req.flash('success').toString(),
      		error: req.flash('error').toString()
		});
	});
});

//获取某个用户的所有文章
router.get('/u/:name',function(req,res){
	var page = parseInt(req.query.p) || 1;
	User.get(req.params.name,function(err,user){
		if(!user){
			req.flas('error','用户不存在！');
			return res.redirect('/');
		}
		//查询并返回该用户的所有文章
		Post.getTen(user.name,page,function(err,posts,total){
			if(err){
				req.flash('error',err);
				return res.redirect('/');
			}
			res.render('user',{
				title:user.name,
				posts:posts,
				page:page,
				isFirstPage:(page - 1) == 0,
				isLastPage:((page - 1) * 10 +posts.length) == total,
				user:req.session.user,
				success:req.flash('success').toString(),
				error:req.flash('error').toString()
			});
		});
	});
});

//根据用户名、发表日期及文章名精确获取一篇文章。
router.get('/u/:name/:day/:title',function(req,res){
	Post.getOne(req.params.name,req.params.day,req.params.title,function(err,post){
		console.log(post.comments);
		if(err){
			req.flash('error',err);
			return res.redirect('/');
		}
		console.log(post);
		res.render('article',{
			title:req.params.title,
			post:post,
			user:req.session.user,
			success:req.flash('success').toString(),
			error:req.flash('error').toString()
		});
	});
});

//注册留言的 POST 响应
router.post('/u/:name/:day/:title',function(req,res){
	var date = new Date(),
		time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
               date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
    var md5 = crypto.createHash('md5'),
    email_MD5 = md5.update(req.body.email.toLowerCase()).digest('hex'),
    head = "http://s.gravatar.com/avatar/" + email_MD5 + "?s=48&r=r"; 
    var comment ={
    	name:req.body.name,
    	head:head,
    	email:req.body.email,
    	website:req.body.website,
    	time:time,
    	content:req.body.content
    };
    console.log('comment=:'+comment);
    var newComment = new Comment(req.params.name,req.params.day,req.params.title,comment);
    newComment.save(function(err){
    	if(err){
    		req.flash('error',err);
    		return res.redirect('back');
    	}
    	req.flash('success','留言成功');
    	res.redirect('back');
    });
});

//修改(get)
router.get('/edit/:name/:day/:title',checkLogin);
router.get('/edit/:name/:day/:title',function(req,res){
	Post.edit(req.params.name,req.params.day,req.params.title,function(err,post){
		if(err){
			req.flash('error',err);
			return res.redirect('back');//返回上一页
		}
		res.render('edit',{
			title:'编辑',
			post:post,
			user:req.session.user,
			success:req.flash('success').toString(),
			error:req.flash('error').toString()
		});
	});
});

//修改(post)
router.post('/edit/:name/:day/:title',checkLogin);
router.post('/edit/:name/:day/:title',function(req,res){
	var currentUser = req.session.user;
	Post.update(currentUser.name,req.params.day,req.params.title,req.body.post,function(err){
		//文章页面url
		var url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
		if(err){
			req.flash('error',err);
			return res.redirect(url);
		}
		req.flash('success','修改成功！');
		res.redirect(url);//成功！返回文章页
	});
});

//删除文章（get）
router.get('/remove/:name/:day/:title',function(req,res){
	var currentUser = req.session.user;
	Post.remove(currentUser.name,req.params.day,req.params.title,function(err){
		if(err){
			req.flash('error',err);
			return res.redirect('back');
		}
		req.flash('success','删除成功');
		res.redirect('/');
	});
});

router.get('/reprint/:name/:day/:title', checkLogin);
router.get('/reprint/:name/:day/:title', function(req,res){
	//Post.edit()返回查询的一篇文章（markdown 格式）
	Post.edit(req.params.name,req.params.day,req.params.title,function(err,post){
		if(err){
			req.flash('error',err);
			return res.redirect('back');
		}

		var currentUser = req.session.user,
			reprint_form = {name:post.name,day:post.time.day,title:post.title},
			reprint_to = {name:currentUser.name,head:currentUser.head};
		Post.reprint(reprint_form,reprint_to,function(err,_post){
			console.log(_post);
			if(err){
				req.flash('error',err);
				return res.redirect('back');
			}

			req.flash("success",'转载成功！');
			console.log('############error  bengin###########');
			console.log(_post.name);
			var url = encodeURI('/u/'+_post.name+'/'+_post.time.day+'/'+_post.title);
			console.log('############error  end###########');
			//跳转到转载后的文章页面
     		res.redirect(url);
		});
	});
});
//404页面
router.use(function(req,res){
	res.render('404');
});

function checkLogin(req,res,next){
	if(!req.session.user){
		req.flash('error','未登录');
		return res.redirect('/login');
	}
	next();
}
function checkNotLogin(req,res,next){
	if(req.session.user){
		req.flash('error','已登录');
		return res.redirect('back');
	}
	next();
}

module.exports = router;

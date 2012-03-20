var express = require("express");
var app = module.exports = express.createServer();
var url = require("url");

// todo: bug with stylesheet path
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(require('stylus').middleware({ src: __dirname + '/' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Main GET /
// todo: get this shit out of here
// I really sorry about this mess, but I don't know how to get rid of it.
app.get(/\//, function(req, res){

  console.log("Request url:" + req.url);
  var fs = require('fs');
  var path = url.parse(req.url).pathname.replace(/%20/g," ");
  var real_path = path;
  if(path[path.length-1] != "/"){ path = path + "/"; }

  // todo: need to read about this more
  var EventEmitter = require('events').EventEmitter;
  var filesEE = new EventEmitter();

  var children = [];
  var files = [];

  var base = __dirname ;


  function files_in_dir(){
    fs.stat(base + real_path, function(err, stats){
      if(err != null) { console.log(err); res.send('Ups'); return;}
      if(stats.isDirectory()){
        fs.readdir(base + real_path, function(err, _files){
          files = _files;
          filesEE.emit('files_ready');
        });
      } else if(stats.isFile()){
        res.sendfile( base + real_path);
      } else { next(); }
    });
  }


  // simple date format function
  // todo: add zero to single digits
  function date_format(date){
    var m_names = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");

    var d = new Date(date);
    var curr_date = d.getDate();
    var curr_month = d.getMonth();
    var curr_year = d.getFullYear();
    var curr_hours = d.getHours();
    var curr_minutes = d.getMinutes();
    return(curr_date + "-" + m_names[curr_month] + "-" + curr_year + " " + curr_hours + ":" + curr_minutes);
  };


  //fs.stat data about every file going to children array of objects
  function info_about_files(){
    
    files.forEach(function(file){
      fs.stat(base+path+file, function(err, stats){
        children[file] = {};
        if(err != null) { console.log(err); res.send('Ups'); return;}
        if(stats.isFile()){
          children[file].isFile = true;
          children[file].size = stats.size;
          children[file].name = file;
          children[file].lastModified = date_format(stats.mtime);
          children.push(file);
        } else {
          children[file].name = file;
          children[file].lastModified = date_format(stats.mtime);
          children.push(file);
        }
      filesEE.emit('files_stats_ready',file);
      },file );
    });

  };

  filesEE.on('files_ready',function(){
  // chinese style
    if(files.length < 1)
    {
      items = [];
      var _path = path.slice(0,path.length-1);
      var p = _path.lastIndexOf("/");
      if(p == 0){
        _path = "/";
      } else {
        _path = path.slice(0,p);
      }
 
      items.push( {name: "Parent Directory", lastModified: " ", size: " ", path : _path });
      res.render('index', {
        title: 'Home',
        items: items,
        path: path
      });
 
    } else {
      info_about_files();
    }
  });

  filesEE.on('files_stats_ready', function(file, stats){

    if(children.length == files.length){
      items = [];
      if(path != '/') {
        var _path = path.slice(0,path.length-1);
        var p = _path.lastIndexOf("/");
        if(p == 0){
          _path = "/";
        } else {
          _path = path.slice(0,p);
        }
        items.push( {name: "Parent Directory", lastModified: " ", size: " ", path : _path });
      }
      if(children.length > 0){
        files.sort();
        files.forEach(function(file){
          items.push({name: file, lastModified: children[file].lastModified, size: children[file].size, path: path + file});
        });
      }
      res.render('index', {
        title: 'Home',
        items: items,
        path: path
      });
    }
  });
  files_in_dir();

});

app.listen(7777);
  


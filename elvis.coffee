express = require 'express'
url = require 'url'
stylus = require 'stylus'
fs = require 'fs'
profiler = require 'v8-profiler'

EventEmitter = require('events').EventEmitter

module.exports = app = express.createServer()

app.set 'views', __dirname + '/views'
app.set 'view engine', 'jade' #default tamplate extension
app.use express.bodyParser()
app.use express.methodOverride()
app.use stylus.middleware src: ' __dirname + "/"'
app.use app.router
app.use express.static __dirname + '/'





app.configure 'development', ->
    app.use express.errorHandler dumpExceptions: on, showStack: true

app.configure 'production', ->
    app.use express.errorHandler()

###
// Main GET /
// todo: get this shit out of here
// I really sorry about this mess, but I don't know how to get rid of it.
###
app.get ///////, (req,res) ->
    console.log "Request url:" + req.url
    path = real_path = url.parse(req.url).pathname.replace(///%20///g, " ")
    if (path[path.length - 1] isnt "/")
        path = path + "/"

    filesEE = new EventEmitter()

    children = []
    files = []

    base = __dirname #+ '/public/'

    files_in_dir = ->
        fs.stat (base + real_path), (err, stats) ->
            if err
                console.log err
                res.send 'Ups'
                return

            if stats.isDirectory()
                fs.readdir base + real_path, (err, _files) ->
                    files = _files
                    filesEE.emit 'files_ready'

            else if stats.isFile
                res.sendfile base + real_path

            else
                next()

#  // simple date format function
#  // todo: add zero to single digits

    date_format = (date) ->
        m_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Aug", "Sep", "Oct", "Nov", "Dec"]
        d = new Date(date)
        curr_date = d.getDate()
        curr_month = d.getMonth()
        curr_year = d.getFullYear()
        curr_hours = d.getHours()
        curr_minutes = d.getMinutes()

        "#{curr_date}-#{m_names[curr_month]}-#{curr_year} #{curr_hours}:#{curr_minutes}"


    info_about_files = ->
        for file in files
            do (file) ->
                fs.stat base + path + file, (err, stats) ->
                    children[file] = {}
                    if err
                        console.log err
                        res.send 'Ups'
                        return
                    if stats.isFile()
                        children[file].isFile = true
                        children[file].size = stats.size
                        children[file].name = file
                        children[file].lastModified = date_format stats.mtime
                        children.push file
                    else
                        children[file].name = file
                        children[file].lastModified = date_format stats.mtime
                        children.push(file)
                    filesEE.emit 'files_stats_ready', file
                , file

    filesEE.on 'files_ready', ->
        if files.length < 1
            items = []
            _path = path.slice 0, path.length - 1
            p = _path.lastIndexOf '/'

            if p is 0
                _path = '/'
            else
                _path = path.slice 0, p


            items.push {name: "Parent Directory", lastModified: " ", size: " ", path : _path }

            res.render 'index', {
                title: 'Home',
                items: items,
                path: path
                }
        else
            info_about_files()


    filesEE.on 'files_stats_ready', (file, stats) ->
        if children.length is files.length
            
            items = []
            if path isnt '/'
                _path = (path.slice 0, path.length-1)
                p = _path.lastIndexOf "/"
            
                if p is 0
                    _path = "/"
                else
                    _path = path.slice 0, p

                items.push { name: "Parent Directory", lastModified: " ", size: " ", path: _path }
        
            if children.length > 0
                files.sort()
                for file in files
                    do (file) ->
                        items.push {
                            name: file,
                            lastModified: children[file].lastModified,
                            size: children[file].size,
                            path: path + file
                            }

            res.render 'index', {
                title: 'Home',
                items: items,
                path: path
                }

    files_in_dir()

app.listen 7777

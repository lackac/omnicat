{print} = require 'sys'
http = require 'http'
{whilst} = require 'async'
ProgressBar = require 'progress'

desc "Fetch GitHub repos that have more than 1 watcher"
task 'fetch', (n) ->
  {db} = getDB()
  n = parseInt(n ? 500)
  progress = new ProgressBar "[:bar] :percent (:elapseds)", total: n, width: 60
  console.log "Fetching repo information..."
  page = 1
  whilst (-> page <= n),
    (next) ->
      getSearchPage page++, (err, repos) ->
        return next(err) if err
        updateRepos db, repos, (err) ->
          progress.tick()
          next(err)
    (err) ->
      throw err if err
      console.log "done."
      complete()
, true

desc "Push design doc to the database"
task 'design', ->
  {couch, db} = getDB()
  ddoc = require './design.coffee'
  for name, view of ddoc.views
    for key, fun of view
      view[key] = fun.toString().replace(/\n +/g, '')
  for key, fun of ddoc.lists
    ddoc.lists[key] = fun.toString().replace(/\n +/g, '')

  console.log "Pushing design doc #{ddoc._id}..."
  db.get ddoc._id, (err, doc) ->
    if err and err.error != "not_found"
      console.log(err)
      complete()
    else
      ddoc._rev = doc._rev if doc
      db.save ddoc._id, ddoc, (err, doc) ->
        console.log(err) if err
        complete()
, true

desc "Trigger view indexing"
task 'trigger', ->
  {couch, db} = getDB()
  console.log "Triggering view indexing..."
  ddoc = require './design.coffee'
  completed = false
  db.view 'repos/by_watchers', limit: 1, (err, res) ->
    completed = true
    console.log(err) if err
    complete()
  taskRe = new RegExp("#{db.name}.* #{ddoc._id}$")
  logStatus = ->
    couch.activeTasks (err, tasks) ->
      if tasks
        for {task, status} in tasks when taskRe.test(task)
          console.log(status)
      setTimeout(logStatus, 2000) unless completed
  logStatus()
, true

desc "Build zip for Chrome Web Store"
task 'build', ->
  spawn = require('child_process').spawn 'zip', ['-r', 'omnicat.zip', 'ext']
  spawn.stderr.on 'data', (data) -> process.stderr.write(data)
  spawn.stdout.on 'data', (data) -> process.stdout.write(data)
  spawn.on 'exit', complete
, true

desc "Open an interactive console with REPL"
task 'console', ->
  unless process.env['_'].match(/\/rlwrap$/)
    console.log "I suggest you use rlwrap and create an alias with it like this:"
    console.log "alias repl='NODE_NO_READLINE=1 rlwrap -w-40 -p Green -C node jake console'"
    # FIXME: output coloring doesn't work for some reason when run through rlwrap

  repl = require "repl"
  csl = repl.start()
  global.emit = (k,v) -> console.log(k,v)
  csl.context.ddoc = ddoc = require "./design"
  for name,view of ddoc.views
    csl.context[name] = view.map

updateRepos = (db, repos, callback) ->
  ids = repos.map (repo) -> "#{repo.owner}:#{repo.name}"
  db.get ids, (err, rows) ->
    callback(err) if err
    bulk_docs = []
    for row, i in rows
      repos[i]._id = ids[i]
      if row.error == "not_found" or not row.doc
        bulk_docs.push(repos[i])
      else if needsUpdate(row.doc, repos[i])
        repos[i]._rev = row.doc._rev
        bulk_docs.push(repos[i])
    db.save bulk_docs, (err, docs) -> callback(err, docs)

needsUpdate = (doc, repo) ->
  doc.description != repo.description or doc.watchers != repo.watchers or doc.forks != repo.forks

getSearchPage = (page, callback) ->
  req = http.get
    host: 'github.com'
    path: "/api/v2/json/repos/search/+?start_page=#{page}"
    (res) ->
      resp_body = ""
      res.on "data", (chunk) -> resp_body += chunk
      res.on "end", ->
        repos = JSON.parse(resp_body).repositories
        callback(null, repos)
      res.on "error", (err) ->
        callback(err)

getDB = ->
  uri = require("url").parse(process.env.DB || "http://localhost:5984/gh-repos")
  db_options = { cache: true, raw: false, cacheSize: 1000, bulkSize: 500 }
  db_options.host = "#{uri.protocol}//#{uri.hostname}"
  db_options.port = uri.port if uri.port
  if uri.auth
    [user, pass] = uri.auth.split(":")
    db_options.auth = { username: user, password: pass }
  db_name = uri.pathname.substr(1)
  connection = new (require('cradle').Connection)(db_options)
  { couch: connection, db: connection.database(db_name) }

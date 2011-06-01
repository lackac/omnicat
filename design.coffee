exports.repos =
  views:
    by_watchers:
      map: (doc) -> emit doc.watchers, doc.description if doc.watchers
    by_language:
      map: (doc) -> emit doc.language, doc.description if doc.language
    by_prefix:
      map: (doc) ->
        return unless doc.type is "repo"

        # emit all prefixes of name
        for c, i in doc.name
          emit [doc.name.substr(0, i+1).toLowerCase(), doc.watchers], doc.description

        # emit all prefixes of owner
        for c, i in doc.owner
          prefix = doc.owner.substr(0, i+1).toLowerCase()
          emit [prefix, doc.watchers], doc.description

          # emit all combined prefixes
          for d, j in doc.name
            emit [prefix + '/' + doc.name.substr(0, j+1).toLowerCase(), doc.watchers], doc.description

  lists:
    complete: (head, req) ->
      start
        headers: { 'Content-Type': 'text/plain' }
      while row = getRow()
        send "#{row.id.replace(':', '/')} (#{row.key[1]}) #{row.value}\n"
      return

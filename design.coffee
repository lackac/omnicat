exports.repos =
  views:
    by_watchers:
      map: (doc) -> emit doc.watchers, doc.description if doc.watchers

    by_language:
      map: (doc) -> emit doc.language, doc.description if doc.language

    by_prefix:
      map: (doc) ->
        return unless doc.owner and doc.name

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
        return

    by_fuzzy:
      map: (doc) ->
        return unless doc.owner and doc.name

        combinations = (arr, max) ->
          combine = (n, src, got, all) ->
            if n is 0
              all[all.length] = got if got.length > 0
              return
            for item, j in src
              combine(n - 1, src.slice(j + 1), got.concat([item]), all)
            return
          all = []
          max = arr.length unless max and max < arr.length
          for i in [1..max]
            combine(i, arr, [], all)
          all

        prefixVariations = (words, max, got=[]) ->
          current = words[0]
          max_length = if max and max < current.length then max else current.length
          if words.length > 1
            all = []
            for i in [1..max_length]
              all = all.concat(prefixVariations(words.slice(1), max, got.concat([current.substr(0,i)])))
            all
          else
            got.concat([current.substr(0,i)]).join('') for i in [1..max_length]

        # only split on capital letters if there's no _ or - in the id
        id = doc._id.indexOf('_') == -1 && doc._id.indexOf('-') == -1 && doc._id.replace(/([A-Z][^A-Z])/g, '-$1') || doc._id
        words = id.toLowerCase().split(/[^a-z0-9]+/).filter (s) -> s.length > 0

        for combination in combinations(words, 7)
          max = if combination.length < 5 then undefined else 10-combination.length
          for key in prefixVariations(combination, max)
            emit [key, doc.watchers], doc.description

        # making sure the full names are emitted
        if words.length > 7 or combination.length > 4 and words.some((w) -> w.length > 10-words.length)
          emit [doc._id.toLowerCase().replace(/[^a-z0-9]/g, ''), doc.watchers], doc.description

        return

  lists:
    complete: (head, req) ->
      start
        headers: { 'Content-Type': 'text/plain' }
      while row = getRow()
        send "#{row.id.replace(':', '/')} (#{row.key[1]}) #{row.value}\n"
      return

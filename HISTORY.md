# 1.1.1 (2011-06-30)

* "Loading" message while a request is in progress
* "No Results" message if no suggestions can be shown
* Hitting return on "Loading" or "No Results" navigates to GitHub search
* Made requests faster a bit
* Fixed a completion issue when database was undefined

# 1.1 (2011-06-16)

* Added support for private repositories: if the user provides a GitHub
  username and token then all the repositories the user has access to
  will show up in the suggestions at the top.
* Added Options page for providing GitHub username and token, and
  enabling experimental options
* Experimental feature: fuzzy completion (combine prefixes of any words
  in the name of the repository to have it suggested)
* Experimental feature: change database that the extension uses

* Reduced number of requests made to the database
* Reduced size of database by only adding properties of repos we care
  about
* Fixed showing a repository more than once in the suggestions
* Fixed typo in `by_language` supporting view

# 1.0.2 (2011-05-19)

* Made use of the default suggestion (first row): it shows and points to
  the #1 result
* Made completion case insensitive

# 1.0.1 (2011-05-16)

* Renamed extension to Omnicat
* Created homepage and changed the url in `manifest.json`
* Fixed repository name indexing

# 1.0 (2011-05-16)

* First Release

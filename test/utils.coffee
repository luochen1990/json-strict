readDir = (dirname, relativePath, min_depth = 0) ->
	fs = require 'fs'
	path = require('path').resolve("#{dirname}/#{relativePath}")
	ls = []
	rec = (path, depth) ->
		fs.readdirSync(path).forEach (item) ->
			p = "#{path}/#{item}"
			if fs.statSync(p).isDirectory()
				rec(p, depth + 1)
			else
				ls.push(p) if depth >= min_depth
	rec(path, 0)
	(s[path.length+1...] for s in ls)

#requireDir = (dirname, path, opts) ->
#	fromList concat readDir(dirname, path, opts?.minDepth).map (s) ->
#		[_, fname, suffix] = s.match /(.+)\.([^.]+)/
#		if fname.match(opts?.without ? null) then [] else [[fname, require(path + fname)]]

module.exports = {readDir}#, requireDir}

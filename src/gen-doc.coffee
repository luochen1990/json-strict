require("coffee-script").register()
{log, foreach} = require 'coffee-mate'
{showPage} = require './render'
{mkdir} = require('shelljs')
expand = require('path').resolve
fs = require 'fs'

write = (fname, s) ->
	i = fname.lastIndexOf('/')
	if i >= 0
		dir = fname[0..i]
		mkdir '-p', dir
		#log 'mkdir', dir
	fs.writeFileSync(fname, s)
	#log 'write', fname

readdir = (path, min_depth = 0) ->
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

#log -> readdir '.'

#log -> show (Fn(Number) Number)
genDocuments = ({src, dest}) ->
	src += '/' if not /\/$/.test src
	dest += '/' if not /\/$/.test dest
	#log -> src
	#log -> dest
	foreach (readdir src), (fname) ->
		if /(.coffee|.litcoffee|.js)$/.test fname
			#log -> fname
			it = require expand("#{src}/#{fname}")
			page = showPage it
			page += """
			<style>
			* {
				line-height: 1.2em
			}
			.typespec .sample pre {
				max-height: none !important;
			}
			</style>
			"""
			pageName = fname.replace /(.coffee|.litcoffee|.js)$/, '.html'
			write(dest + pageName, page)

module.exports = {genDocuments}



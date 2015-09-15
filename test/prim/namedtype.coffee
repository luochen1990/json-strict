{NamedType, Int} = require '../../src/'
{readDir} = require '../utils'

requireDir = (path, opts) ->
	fromList concat readDir(__dirname, './', opts?.minDepth).map (s) ->
		[_, fname, suffix] = s.match /(.+)\.([^.]+)/
		if fname.match(opts?.without ? null) then [] else [[fname, require('./' + fname)]]

otherCases = requireDir('./', without: /namedtype/)

flattened = list concat map(([k, v]) -> concat map(pluck 1) enumerate(v.matchCases)) enumerate(otherCases)

matchCases =
	'keep the same result when `check` function is not provided': flattened.map ([t, v, m]) ->
		[NamedType({name: 'A', spec: t}), v, m]
	'keep the same result when `check` function is const true': flattened.map ([t, v, m]) ->
		[NamedType({name: 'A', spec: t, check: (-> true)}), v, m]
	'always returns false when `check` function is const false': flattened.map ([t, v, m]) ->
		[NamedType({name: 'A', spec: t, check: (-> false)}), v, no]
	'defines even correctly': [
		[NamedType({name: 'A', spec: Int, check: ((x) -> x % 2 == 0)}), NaN, no]
		[NamedType({name: 'A', spec: Int, check: ((x) -> x % 2 == 0)}), 0, yes]
		[NamedType({name: 'A', spec: Int, check: ((x) -> x % 2 == 0)}), 1, no]
		[NamedType({name: 'A', spec: Int, check: ((x) -> x % 2 == 0)}), 2, yes]
		[NamedType({name: 'A', spec: Int, check: ((x) -> x % 2 == 0)}), 3, no]
		[NamedType({name: 'A', spec: Int, check: ((x) -> x % 2 == 0)}), 4, yes]
	]

module.exports = {matchCases}

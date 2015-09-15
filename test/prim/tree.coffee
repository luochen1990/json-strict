{Tree} = require '../../src/'

matchCases =
	'doesnt match undefined/null': [
		[Tree(String), undefined, no]
		[Tree(String), null, no]
		[Tree(Number), undefined, no]
		[Tree(Number), null, no]
	]
	'doesnt match values of any other types': [
		[Tree(String), true, no]
		[Tree(String), 'c', no]
		[Tree(Number), 1, no]
	]
	'doesnt match objects with wrong keys': [
		[Tree(Number), {}, no]
		[Tree(Number), {a: 1, b: 2}, no]
		[Tree(Number), {rootLabel: 1}, no]
		[Tree(Number), {subForest: []}, no]
	]
	'doesnt match objects with correct keys but wrong values': [
		[Tree(Number), {rootLabel: 'a', subForest: []}, no]
		[Tree(Number), {rootLabel: 1, subForest: 'a'}, no]
		[Tree(Number), {rootLabel: 1, subForest: {}}, no]
		[Tree(Number), {rootLabel: 1, subForest: [{rootLabel: 'a', subForest: []}]}, no]
		[Tree(Number), {rootLabel: 1, subForest: [{rootLabel: 2, subForest: 'a'}]}, no]
		[Tree(Number), {rootLabel: 1, subForest: [{rootLabel: 2, subForest: []}, {rootLabel: 'a', subForest: []}]}, no]
		[Tree(Number), {rootLabel: 1, subForest: [{rootLabel: 2, subForest: []}, {rootLabel: 3, subForest: 'a'}]}, no]
	]
	'matches objects with correct keys and values': [
		[Tree(Number), {rootLabel: 1, subForest: []}, yes]
		[Tree(Number), {rootLabel: 1, subForest: [{rootLabel: 2, subForest: []}]}, yes]
		[Tree(Number), {rootLabel: 1, subForest: [
			{rootLabel: 2, subForest: [
				{rootLabel: 3, subForest: []},
				{rootLabel: 4, subForest: [{rootLabel: 5, subForest: []}]}
			]}
		]}, yes]
	]

module.exports = {matchCases}

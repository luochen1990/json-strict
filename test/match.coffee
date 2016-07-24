prim = require './prim'
{unmatchMessages, match, show} = require '../src/'

describe 'match()', ->
	foreach enumerate(prim), ([primName, primContent]) ->
		describe primName, ->
			foreach enumerate(primContent.matchCases), ([k, cases]) ->
				foreach enumerate(cases), ([i, [t, v, expected]]) ->
					it "#{k} [#{i}]", ->
						assertEq (-> match(t)(v)), -> expected

describe 'unmatchMessages()', ->
	foreach enumerate(prim), ([primName, primContent]) ->
		describe primName, ->
			foreach enumerate(primContent.matchCases), ([k, cases]) ->
				foreach enumerate(cases), ([i, [t, v, expected]]) ->
					it "#{k} [#{i}]", ->
						assertEq (-> (unmatchMessages(t)(v).length == 0)), -> expected


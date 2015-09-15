prim = require './prim'
{unmatchMessages, match, show} = require '../src/'

describe 'match()', ->
	foreach enumerate(prim), ([primName, primContent]) ->
		describe primName, ->
			foreach enumerate(primContent.matchCases), ([k, cases]) ->
				foreach enumerate(cases), ([i, [t, v, m]]) ->
					it "#{k} [#{i}]", ->
						assert -> match(t)(v) is m

describe 'unmatchMessages()', ->
	foreach enumerate(prim), ([primName, primContent]) ->
		describe primName, ->
			foreach enumerate(primContent.matchCases), ([k, cases]) ->
				foreach enumerate(cases), ([i, [t, v, m]]) ->
					it "#{k} [#{i}]", ->
						assert -> (unmatchMessages(t)(v).length == 0) is m


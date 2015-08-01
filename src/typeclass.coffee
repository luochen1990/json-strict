require 'coffee-mate/global'

{typeclass, instance} = do ->
	reg = {}

	typeclass = (classname) ->
		cls = reg[classname] ?= {}
		(funcnames) ->
			fs = funcnames.map (funcname) ->
				ls = cls[funcname] ?= []
				(arg) ->
					for [type, funcbody] in ls
						log -> type
						if arg.constructor is type
							return funcbody(arg)
					throw TypeError "no instance of #{classname} for #{arg.constructor.name or 'UnnamedType'}"
			return dict list zip funcnames, fs

	instance = (classname) ->
		cls = reg[classname] ?= {}
		(type) ->
			log -> type
			where: (funcdict) ->
				foreach (enumerate funcdict), ([funcname, funcbody]) ->
					(cls[funcname] ?= []).push [type, funcbody]

	return {typeclass, instance}

module.exports = {show}

if module.parent is null
	{show} = typeclass('Show') ['show']

	instance('Show')(String).where
		show: (s) -> json s


	log -> show "hello"
	#log -> show null
	#log -> show 0
	#log -> show {x: 1}

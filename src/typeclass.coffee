require 'coffee-mate/global'

{typeclass, instance} = do ->
	reg = {}

	typeclass = (classname) ->
		cls = reg[classname] ?= {}
		where: (funcs) ->
			rst_funcs = {}
			foreach enumerate(funcs), ([funcname, funcdefault]) ->
				ls = cls[funcname] ?= []
				f = (arg) ->
					for [type, funcbody] in ls
						#log -> type
						if arg.constructor is type
							return funcbody(arg)
					if funcdefault?
						return funcdefault.call(rst_funcs, arg)
					else
						throw TypeError "no instance of #{classname} for #{arg.constructor.name or 'UnnamedType'}"
				rst_funcs[funcname] = f
			return rst_funcs

	instance = (classname) ->
		cls = reg[classname] ?= {}
		(type) ->
			#log -> type
			where: (funcdict) ->
				foreach (enumerate funcdict), ([funcname, funcbody]) ->
					(cls[funcname] ?= []).push [type, funcbody]

	return {typeclass, instance}

module.exports = {typeclass, instance}

if module.parent is null
	{show} = typeclass('Show').where
		show: -> str @zero()
		zero: -> 0

	instance('Show')(String).where
		show: (s) -> json s

	instance('Show')(Number).where {}

	log -> show "hello"
	log -> show 1
	#log -> show null
	#log -> show 0
	#log -> show {x: 1}

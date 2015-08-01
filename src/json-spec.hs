class TypeSpec a where
	match :: a -> Dynamic -> Bool
	show :: a -> String
	showHtml :: a -> Html
	displayName :: a -> Maybe String
	discription :: a -> Maybe String
	sample :: a -> Dynamic
	samples :: a -> [Dynamic]

instance TypeSpec Enum where
	match (Enum vs) v = v `elem` vs
	show (Enum vs) = if length vs > 1 then "Enum [#{vs[0]} ...]" else "Enum [#{vs[0]}]"
	displayName (Enum _) = Nothing

instance TypeSpec Bool where
	match Bool v = v `elem` [true, false]
	show Bool = "Bool"
	displayName Bool = Nothing

instance TypeSpec Number where
	match Number v = typeof v is 'number' or v.constructor is Prim.Number
	show Number = "Number"
	displayName Number = Nothing

instance TypeSpec String where
	match String v = s.constructor is Prim.String
	show String = "String"
	displayName String = Nothing

instance TypeSpec Maybe where
	match (Maybe spec) v = not v? or match spec v
	show (Maybe spec) = "Maybe #{show spec}"
	displayName (Maybe _) = Nothing

instance TypeSpec Either where
	match (Either specs) v = (ks = Object.keys(v)).length is 1 and (spec = specs[ks[0]])? and match(spec) v

instance TypeSpec Dict where
	match (Dict spec) v = all(match spec) map(seek v) Object.keys(v)

instance TypeSpec {k1: spec1, k2: spec2 ...} where
	match specobj v = Object.keys(specobj) == Object.keys(v) and all id [match spec v[k] | (k, spec) <- specobj]
	show specobj = '{' + ["#{k}: #{show spec}" for (k, spec) in specobj].join(', ') + '}'
	displayName {_} = Nothing

instance TypeSpec [spec] where
	match [spec] v = all(match spec) v
	show specobj = "[#{show spec}]"
	displayName [_] = Nothing

instance TypeSpec Data where
	match (Data {spec: spec}) v = match spec v
	show (Data d) v = d.name ? show d.spec
	displayName (Data d) = d.name


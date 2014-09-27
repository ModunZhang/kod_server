local modelName = KEYS[1]
local fullKey = modelName .. ":*"
local keys = redis.call("keys", fullKey)
if not keys or #keys == 0 then return {} end
return redis.call("mget", unpack(keys))

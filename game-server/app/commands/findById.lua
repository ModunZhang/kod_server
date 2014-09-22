local modelName = KEYS[1]
local key = KEYS[2]
local fullKey = modelName .. ":" .. key
return redis.call("get", fullKey)
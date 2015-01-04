local modelName = KEYS[1]
local fullKey = modelName .. ":*"
return redis.call("keys", fullKey)

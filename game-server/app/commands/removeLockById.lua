local modelName = KEYS[1]
local id = KEYS[2]
local fullKey = modelName .. ":" .. id
local lockKey = "lock." .. fullKey
return redis.call("del", lockKey)
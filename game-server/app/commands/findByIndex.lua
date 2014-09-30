local modelName = KEYS[1]
local index = KEYS[2]
local value = KEYS[3]
local fullIndex = modelName .. "." .. index .. ":" .. value
local objectString = redis.call("get", fullIndex)
if not objectString then return end
local fullKey = modelName .. ":" .. redis.call("get", fullIndex)
return redis.call("get", fullKey)
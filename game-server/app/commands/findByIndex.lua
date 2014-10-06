local lockSeconds = 2 * 1000
local modelName = KEYS[1]
local index = KEYS[2]
local value = KEYS[3]
local now = tonumber(KEYS[4])
local expireTime = now + lockSeconds
local fullIndex = modelName .. "." .. index .. ":" .. value
local objectId = redis.call("get", fullIndex)
if not objectId then return end
local fullKey = modelName .. ":" .. objectId
local objectString = redis.call("get", fullKey)
assert(objectString, "findByIndex:object not exist")
local lockKey = "lock." .. fullKey
local isLocked = redis.call("setnx", lockKey, expireTime)
if isLocked == 1 then return objectString end
local previousExpireTime = tonumber(redis.call("get", lockKey))
assert(previousExpireTime <= now, "findByIndex:" .. modelName .. "[" .. objectId .. "]" ..  " object is locked")
local nextExpireTime = tonumber(redis.call("getset", lockKey, expireTime))
assert(nextExpireTime == previousExpireTime, "findByIndex:" .. modelName .. "[" .. objectId .. "]" ..  "get lock failed")
return objectString
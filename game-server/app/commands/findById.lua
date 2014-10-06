local lockSeconds = 2 * 1000
local modelName = KEYS[1]
local objectId = KEYS[2]
local now = tonumber(KEYS[3])
local expireTime = now + lockSeconds
local fullKey = modelName .. ":" .. objectId
local objectString = redis.call("get", fullKey)
if not objectString then return end
local lockKey = "lock." .. fullKey
local isLocked = redis.call("setnx", lockKey, expireTime)
if isLocked == 1 then return objectString end
local previousExpireTime = tonumber(redis.call("get", lockKey))
assert(previousExpireTime <= now, "findById:" .. modelName .. "[" .. objectId .. "]" ..  " object is locked")
local nextExpireTime = tonumber(redis.call("getset", lockKey, expireTime))
assert(nextExpireTime == previousExpireTime, "findById:" .. modelName .. "[" .. objectId .. "]" ..  "get lock failed")
return objectString
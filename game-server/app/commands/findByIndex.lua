local NONE = "__NONE__"
local LOCKED = "__LOCKED__"
local lockSeconds = 2 * 1000
local modelName = KEYS[1]
local index = KEYS[2]
local value = KEYS[3]
local now = tonumber(KEYS[4])
local expireTime = now + lockSeconds
local fullIndex = modelName .. "." .. index .. ":" .. value
local objectId = redis.call("get", fullIndex)
if not objectId then return NONE end
local fullKey = modelName .. ":" .. objectId
local objectString = redis.call("get", fullKey)
if not objectString then return NONE end
local lockKey = "lock." .. fullKey
local isLocked = redis.call("setnx", lockKey, expireTime)
if isLocked == 1 then return objectString end
local previousExpireTime = tonumber(redis.call("get", lockKey))
if previousExpireTime > now then return LOCKED end
local nextExpireTime = tonumber(redis.call("getset", lockKey, expireTime))
return nextExpireTime == previousExpireTime and objectString or LOCKED
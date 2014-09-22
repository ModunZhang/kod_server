local modelName = KEYS[1]
local fullKey = modelName .. ":*"
local keys = redis.call("keys", fullKey)
if keys and #keys > 0 then
    return redis.call("mget", unpack(keys))
end
return nil

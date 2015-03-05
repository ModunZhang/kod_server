local modelName = table.remove(KEYS, 1)
local keys = KEYS
local fullKeys = {}
for _, key in ipairs(keys) do
    local fullKey = modelName .. ":" .. key
    table.insert(fullKeys, fullKey)
end
return redis.call("mget", unpack(fullKeys))

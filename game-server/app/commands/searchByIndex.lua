local modelName = KEYS[1]
local index = KEYS[2]
local value = KEYS[3]
local keyworld = modelName .. "." .. index .. ":*" .. value .. "*"
local keys = redis.call("keys", keyworld)
if #keys == 0 then return {} end
local fullKeys = {}
for i = 1, #keys do
    local key = keys[i]
    local fullKey = modelName .. ":" .. redis.call("get", key)
    table.insert(fullKeys, fullKey)
end
return redis.call("mget", unpack(fullKeys))
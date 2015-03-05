local modelName = table.remove(KEYS, 1)
local keys = KEYS
local fullKeys = {}
for _, key in ipairs(keys) do
    local fullKey = modelName .. ":" .. key
    table.insert(fullKeys, fullKey)
end

for _,v in ipairs(fullKeys) do
	local fullKey = v
	local lockKey = "lock." .. fullKey
	redis.call("del", fullKey)
	redis.call("del", lockKey)
end
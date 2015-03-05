local function split(s, p)
    local rt = {}
    string.gsub(s, '[^' .. p .. ']+', function(w) table.insert(rt, w) end)
    return rt
end

local modelName = KEYS[1]
local keys = modelName .. ":*"
local fullKeys = redis.call("keys", keys)
if not fullKeys or #fullKeys == 0 then return end
for _,v in ipairs(fullKeys) do
	local fullKey = v
	local lockKey = "lock." .. fullKey
	redis.call("del", fullKey)
	redis.call("del", lockKey)
end
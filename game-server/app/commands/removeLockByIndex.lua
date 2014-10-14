local function split(s, p)
    local rt = {}
    string.gsub(s, '[^' .. p .. ']+', function(w) table.insert(rt, w) end)
    return rt
end

local modelName = KEYS[1]
local index = KEYS[2]
local value = KEYS[3]
local fullIndex = modelName .. "." .. index .. ":" .. value
local objectId = redis.call("get", fullIndex)
if not objectId then return end
local fullKey = modelName .. ":" .. objectId
local lockKey = "lock." .. fullKey
return redis.call("del", lockKey)
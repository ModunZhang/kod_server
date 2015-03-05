local function split(s, p)
    local rt = {}
    string.gsub(s, '[^' .. p .. ']+', function(w) table.insert(rt, w) end)
    return rt
end

local modelName = KEYS[1]
local objectId = KEYS[2]
local fullKey = modelName .. ":" .. objectId
local lockKey = "lock." .. fullKey
assert(redis.call("get", lockKey), "removeById:" .. modelName .. "[" .. objectId .. "]" ..  "can not remove a object directly")
local objectString = redis.call("get", fullKey)
if not objectString then return end
redis.call("del", fullKey)
redis.call("del", lockKey)


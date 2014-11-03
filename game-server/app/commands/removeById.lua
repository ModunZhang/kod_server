local function split(s, p)
    local rt = {}
    string.gsub(s, '[^' .. p .. ']+', function(w) table.insert(rt, w) end)
    return rt
end

local modelName = KEYS[1]
local objectId = KEYS[2]
local indexs = ARGV
local fullKey = modelName .. ":" .. objectId
local lockKey = "lock." .. fullKey
assert(redis.call("get", lockKey), "removeById:" .. modelName .. "[" .. objectId .. "]" ..  "can not remove a object directly")
local objectString = redis.call("get", fullKey)
if not objectString then return end
local object = cjson.decode(objectString)
for _, index in ipairs(indexs) do
    local value = object
    local levels = split(index, ".")
    for _, current in ipairs(levels) do
        value = value[current]
    end
    local key = modelName .. "." .. index .. ":" .. value
    redis.call("del", key)
end
redis.call("del", fullKey)
redis.call("del", lockKey)

